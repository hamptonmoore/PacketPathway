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
  PacketContext,
} from "./Protocol";
import { ARPTable } from "./ArpTable";
import { NetworkInterface } from "./NetworkInterface";

export class Router {
  interfaces: NetworkInterface[];
  hostname: string;
  arpTable: ARPTable;
  routingTable: Map<IPAddress, NetworkInterface>;

  constructor(hostname: string) {
    this.hostname = hostname;
    this.interfaces = [];
    this.arpTable = new ARPTable();
    this.routingTable = new Map();
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

  RegisterInterface(iface: NetworkInterface) {
    this.interfaces.push(iface);
    iface.RegisterDeviceCallback(this);
    // Add the interface to the routing table
    iface.ip.forEach((ip) => {
      this.routingTable.set(ip.asSubnet(), iface);
    });
  }

  SendArpRequest(dst: IPAddress, ctx: PacketContext) {
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
    ctx.iface = iface;
    const packet: EthernetPacket = {
      CONTEXT: ctx,
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
    ctx.Log(this, `SENT: ARP request for ${dst.toString()}`);
    iface.Egress(packet);
  }

  HandlePacket(packet: EthernetPacket) {
    const ctx = packet.CONTEXT;

    const iface = ctx.iface as NetworkInterface;
    ctx.Log(
      this,
      `RECV: packet (dst ${packet.dst.toString()}) on ${this.IfaceToLinux(
        iface,
      )}`,
    );

    // Verfiy the packet is for us
    if (!packet.dst.equals(iface.mac) && !packet.dst.isBroadcast()) {
      ctx.Log(this, `DROP: packet not for us`);
      return;
    }

    switch (packet.type) {
      case ETHERNET_TYPE.IP:
        this.HandleIP(packet.data as IP, packet.CONTEXT.Indent("IP Handler"));
        break;
      case ETHERNET_TYPE.ARP:
        this.HandleARP(packet.data as ARP, packet.CONTEXT.Indent("ARP Handler"));
        break;
    }
  }

  HandleARP(packet: ARP, ctx: PacketContext) {
    const iface = ctx.iface as NetworkInterface;
    if (packet.operation === ARP_OPERATION.REQUEST) {
      this.arpTable.Add(packet.senderProtocolAddress, {
        MAC: packet.senderHardwareAddress,
        Interface: iface,
      });

      ctx.Log(
        this,
        `RECV: ARP ${packet.senderProtocolAddress.toString()} on ${this.IfaceToLinux(
          iface,
        )}`
      );
      ctx.Log(
        this,
        `CACHE: ARP ${packet.senderProtocolAddress.toString()} -> ${packet.senderHardwareAddress.toString()}`,
      );

      if (!this.OwnsIP(packet.targetProtocolAddress)) {
        ctx.Log(this, `DROP: request not for us`);
        return;
      }

      const reply: EthernetPacket = {
        CONTEXT: ctx.Indent(`Responding to ARP request`),
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
      ctx.Log(this, `SENT: to ARP response`);
      iface.Egress(reply);
    }
    if (packet.operation === ARP_OPERATION.REPLY) {
      ctx.Log(
        this,
        `RECV: ARP response from ${packet.senderProtocolAddress.toString()} on ${this.IfaceToLinux(
          iface,
        )}`,
      );
      this.arpTable.Add(packet.senderProtocolAddress, {
        MAC: packet.senderHardwareAddress,
        Interface: iface,
      });
      ctx.Log(
        this,
        `CACHE: ARP ${packet.senderProtocolAddress.toString()} -> ${packet.senderHardwareAddress.toString()}`,
      );
    }
  }

  HandleIP(packet: IP, ctx: PacketContext) {
    switch (packet.protocol) {
      case IP_PROTOCOL.ICMP:
        this.HandleICMP(packet.data as ICMP, ctx.Indent("ICMP Handler"));
        break;
    }
  }

  // SendIPPacket(packet: IP, ctx: PacketContext) {
  //   const iface = ctx.iface as NetworkInterface;


  HandleICMP(packet: ICMP, ctx: PacketContext) {
    // if (packet.type === 8) {
    //   Log(
    //     this,
    //     `received ICMP echo request from ${(
    //       ethPacket.data as IP
    //     ).src.toString()} on interface ${iface.mac}`,
    //   );
    //   const reply: EthernetPacket = {
    //     PACKET_TYPE: "ETHERNET",
    //     src: iface.mac,
    //     dst: ethPacket.src,
    //     type: ETHERNET_TYPE.IP,
    //     data: {
    //       PACKET_TYPE: "IP",
    //       src: iface.ip[0],
    //       dst: (ethPacket.data as IP).src,
    //       protocol: IP_PROTOCOL.ICMP,
    //       data: {
    //         PACKET_TYPE: "ICMP",
    //         type: 0,
    //         code: 0,
    //         data: packet.data,
    //       },
    //     },
    //   };
    //   iface.Egress(reply);
    // }
    // if (packet.type === 0) {
    //   Log(
    //     this,
    //     `received ICMP echo reply from ${(
    //       ethPacket.data as IP
    //     ).src.toString()} on interface ${iface.mac}`,
    //   );
    // }
  }
}
