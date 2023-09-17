import { Log } from "./Logger";
import { Network } from "./Network";
import {
  IPAddress,
  MACAddress,
  EthernetPacket,
  IP,
  ETHERNET_TYPE,
  IP_PROTOCOL,
  ICMP,
  ARP_OPERATION,
  ARP,
} from "./Protocol";

interface ARPEntry {
  MAC: MACAddress;
  Interface: NetworkInterface;
}
export class Router {
  interfaces: NetworkInterface[];
  hostname: string;
  arpTable: Map<IPAddress, ARPEntry>;

  constructor(hostname: string) {
    this.hostname = hostname;
    this.interfaces = [];
    this.arpTable = new Map();
  }

  LoggerName() {
    return this.hostname;
  }

  OwnsIP(ip: IPAddress) {
    return (
      this.interfaces.filter((iface) => {
        return (
          iface.ip.filter((ifaceIP) => {
            return ifaceIP.equals(ip);
          }).length > 0
        );
      }).length > 0
    );
  }

  IfaceToLinux(iface: NetworkInterface) {
    return "eth" + this.interfaces.indexOf(iface);
  }

  DumpArpTable() {
    this.arpTable.forEach((entry, ip) => {
      console.log(
        `${ip.toString()} -> ${entry.MAC.toString()} on interface ${this.IfaceToLinux(
          entry.Interface,
        )}`,
      );
    });
  }

  RegisterInterface(iface: NetworkInterface) {
    this.interfaces.push(iface);
    iface.RegisterDeviceCallback(this);
  }

  SendArpRequest(dst: IPAddress) {
    // Find the interface that matches the destination IP
    const iface = this.interfaces.filter((iface) => {
      return (
        iface.ip.filter((ip) => {
          return ip.inNetwork(dst);
        }).length > 0
      );
    })[0];

    if (!iface) {
      throw new Error("No interface found");
    }

    const packet: EthernetPacket = {
      PACKET_TYPE: "ETHERNET",
      src: iface.mac,
      dst: MACAddress.fromString("ff:ff:ff:ff:ff:ff"),
      type: ETHERNET_TYPE.ARP,
      data: {
        PACKET_TYPE: "ARP",
        operation: ARP_OPERATION.REQUEST,
        senderHardwareAddress: iface.mac,
        senderProtocolAddress: iface.ip[0],
        targetHardwareAddress: MACAddress.fromString("00:00:00:00:00:00"),
        targetProtocolAddress: dst,
      },
    };
    Log(this, `sending ARP request for ${dst.toString()}`);
    iface.Egress(packet);
  }

  HandlePacket(packet: EthernetPacket, iface: NetworkInterface) {
    Log(
      this,
      `received packet (dst ${packet.dst.toString()}) on ${this.IfaceToLinux(
        iface,
      )}`,
    );
    switch (packet.type) {
      case ETHERNET_TYPE.IP:
        this.HandleIP(packet.data as IP, iface, packet);
        break;
      case ETHERNET_TYPE.ARP:
        this.HandleARP(packet.data as ARP, iface);
        break;
    }
  }

  HandleARP(packet: ARP, iface: NetworkInterface) {
    if (packet.operation === ARP_OPERATION.REQUEST) {
      this.arpTable.set(packet.senderProtocolAddress, {
        MAC: packet.senderHardwareAddress,
        Interface: iface,
      });

      Log(
        this,
        `received ARP request from ${packet.senderProtocolAddress.toString()} on ${this.IfaceToLinux(
          iface,
        )}`,
        1,
      );
      Log(
        this,
        `ARP cache ${packet.senderProtocolAddress.toString()} -> ${packet.senderHardwareAddress.toString()}`,
        2,
      );

      if (!this.OwnsIP(packet.targetProtocolAddress)) {
        Log(this, `dropped foreign host ARP request`, 2);
        return;
      }

      const reply: EthernetPacket = {
        PACKET_TYPE: "ETHERNET",
        src: iface.mac,
        dst: packet.senderHardwareAddress,
        type: ETHERNET_TYPE.ARP,
        data: {
          PACKET_TYPE: "ARP",
          operation: ARP_OPERATION.REPLY,
          senderHardwareAddress: iface.mac,
          senderProtocolAddress: iface.ip[0],
          targetHardwareAddress: packet.senderHardwareAddress,
          targetProtocolAddress: packet.senderProtocolAddress,
        },
      };
      Log(this, `responded to ARP request`, 2);
      iface.Egress(reply);
    }
    if (packet.operation === ARP_OPERATION.REPLY) {
      Log(
        this,
        `received ARP reply from ${packet.senderProtocolAddress.toString()} on ${this.IfaceToLinux(
          iface,
        )}`,
        1,
      );
      this.arpTable.set(packet.senderProtocolAddress, {
        MAC: packet.senderHardwareAddress,
        Interface: iface,
      });
      Log(
        this,
        `ARP cache ${packet.senderProtocolAddress.toString()} -> ${packet.senderHardwareAddress.toString()}`,
        2,
      );
    }
  }

  HandleIP(packet: IP, iface: NetworkInterface, ethPacket: EthernetPacket) {
    switch (packet.protocol) {
      case IP_PROTOCOL.ICMP:
        this.HandleICMP(packet.data as ICMP, iface, ethPacket);
        break;
    }
  }

  HandleICMP(packet: ICMP, iface: NetworkInterface, ethPacket: EthernetPacket) {
    if (packet.type === 8) {
      Log(
        this,
        `received ICMP echo request from ${(
          ethPacket.data as IP
        ).src.toString()} on interface ${iface.mac}`,
      );
      const reply: EthernetPacket = {
        PACKET_TYPE: "ETHERNET",
        src: iface.mac,
        dst: ethPacket.src,
        type: ETHERNET_TYPE.IP,
        data: {
          PACKET_TYPE: "IP",
          src: iface.ip[0],
          dst: (ethPacket.data as IP).src,
          protocol: IP_PROTOCOL.ICMP,
          data: {
            PACKET_TYPE: "ICMP",
            type: 0,
            code: 0,
            data: packet.data,
          },
        },
      };
      iface.Egress(reply);
    }
    if (packet.type === 0) {
      Log(
        this,
        `received ICMP echo reply from ${(
          ethPacket.data as IP
        ).src.toString()} on interface ${iface.mac}`,
      );
    }
  }
}

export class NetworkInterface {
  device: Router | null;
  mac: MACAddress;
  ip: IPAddress[];
  network: Network | null;
  constructor(mac: MACAddress, ip: IPAddress[]) {
    this.network = null;
    this.device = null;
    this.mac = mac;
    this.ip = ip;
  }

  RegisterDeviceCallback(device: Router) {
    this.device = device;
  }

  RegisterNetworkCallback(network: Network) {
    this.network = network;
  }

  Ingress(packet: EthernetPacket) {
    if (packet.dst === this.mac || packet.dst.isBroadcast()) {
      if (!this.device) {
        throw new Error("Device not registered");
      }
      this.device.HandlePacket(packet, this);
    }
  }

  Egress(packet: EthernetPacket) {
    if (!this.network) {
      throw new Error("Network not registered");
    }

    this.network.Forward(packet, this);
  }
}
