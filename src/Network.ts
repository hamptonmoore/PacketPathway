import { Device, NetworkInterface } from "./Device";
import { Log } from "./Logger";

export class IPAddress {
  address: Uint8Array;
  mask: Uint8Array;
  constructor(address: Uint8Array, mask: Uint8Array) {
    if (address.length !== 4) {
      throw new Error("Invalid address");
    }
    if (mask.length !== 4) {
      throw new Error("Invalid mask");
    }

    this.address = address;
    this.mask = mask;
  }
  toString() {
    return Array.from(this.address)
      .map((octet) => octet.toString())
      .join(".");
  }
  static fromCIDR(cidr: string) {
    const [address, mask] = cidr.split("/");
    const addressBytes = address.split(".").map((octet) => parseInt(octet));
    const maskBytes = new Uint8Array(4);
    maskBytes.fill(0);
    const maskBits = parseInt(mask);
    for (let i = 0; i < maskBits; i++) {
      maskBytes[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
    }
    return new IPAddress(Uint8Array.from(addressBytes), Uint8Array.from(maskBytes));
  }
}

export class MACAddress {
  address: Uint8Array;
  constructor(address: Uint8Array) {
    if (address.length !== 6) {
      throw new Error("Invalid address");
    }
    this.address = address;
  }
  toString() {
    return Array.from(this.address)
      .map((octet) => octet.toString(16).padStart(2, "0"))
      .join(":");
  }
  isBroadcast() {
    return this.address.every((octet) => octet === 0xff);
  }
  static fromString(address: string) {
    const addressBytes = address.split(":").map((octet) => parseInt(octet, 16));
    return new MACAddress(Uint8Array.from(addressBytes));
  }
}

export enum ICMP_TYPE {
  ECHO_REPLY = 0,
  ECHO_REQUEST = 8,
  DESTINATION_UNREACHABLE = 3,
}

export enum ICMP_CODE {
  ECHO_REPLY = 0,
  ECHO_REQUEST = 0,
  DESTINATION_UNREACHABLE = 0,
  DESTINATION_HOST_UNREACHABLE = 1,
  DESTINATION_NETWORK_UNKNOWN = 6,
  NETWORK_ADMINISTRATIVELY_PROHIBITED = 13,
}

export interface ICMP {
  PACKET_TYPE: "ICMP";
  type: ICMP_TYPE;
  code: ICMP_CODE;
  data: string;
}

export enum IP_PROTOCOL {
  ICMP = 1,
}

export interface IP {
  PACKET_TYPE: "IP";
  src: IPAddress;
  dst: IPAddress;
  protocol: IP_PROTOCOL;
  data: ICMP | string;
}

export enum ARP_OPERATION {
  REQUEST = 1,
  REPLY = 2,
}

export interface ARP {
  PACKET_TYPE: "ARP";
  operation: ARP_OPERATION;
  senderHardwareAddress: MACAddress;
  senderProtocolAddress: IPAddress;
  targetHardwareAddress: MACAddress;
  targetProtocolAddress: IPAddress;
}

export enum ETHERNET_TYPE {
  IP = 0x0800,
  ARP = 0x0806,
}

export interface EthernetPacket {
  PACKET_TYPE: "ETHERNET";
  src: MACAddress;
  dst: MACAddress;
  type: ETHERNET_TYPE;
  data: IP | ARP;
}

export class Network {
  interfaces: NetworkInterface[];
  forwardingTable: Map<MACAddress, NetworkInterface>;  
  name: string;

  constructor(name: string) {
    this.name = name;
    this.interfaces = [];
    this.forwardingTable = new Map();
  }

  LoggerName() {
    return `${this.name} Network`;
  }

  RegisterInterface(iface: NetworkInterface) {
    this.interfaces.push(iface);
    iface.RegisterNetworkCallback(this);
  }

  DumpForwardingTable() {
    console.log("Forwarding table:");
    this.forwardingTable.forEach((iface, mac) => {
      console.log(`${mac} -> eth${this.interfaces.indexOf(iface)}`);
    });
  }

  Forward(packet: EthernetPacket, iface: NetworkInterface) {
    // Cache source MAC address
    Log(this, `Received packet from ${packet.src} on eth${this.interfaces.indexOf(iface)}`)
   
    if (!this.forwardingTable.has(packet.src)) {
      Log(this, `Caching ${packet.src} -> eth${this.interfaces.indexOf(iface)}`)
      this.forwardingTable.set(packet.src, iface);
    }

    const dst = packet.dst;
    const dstIFace = this.forwardingTable.get(dst);
    if (dstIFace) {
      dstIFace.Ingress(packet);
    } else {
      // Send to all interfaces except the one it came from
      this.interfaces
        .filter(dstIface => dstIface != iface)
        .forEach((dIface) => dIface.Ingress(packet));
    }
  }

  GetInterfaces() {
    return this.interfaces;
  }
}
