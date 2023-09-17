import { NetworkInterface } from "./Router";

export type IPAddressRaw = Uint8Array;

export class IPAddress {
  address: IPAddressRaw;
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

  equals(ip: IPAddress) {
    return this.address.every((octet, i) => octet === ip.address[i]);
  }

  asSubnet() {
    const subnet = new Uint8Array(4);
    subnet.fill(0);
    this.address.forEach((octet, i) => {
      subnet[i] = octet & this.mask[i];
    });
    return new IPAddress(subnet, this.mask);
  }

  inNetwork(ip: IPAddress) {
    return this.address.every(
      (octet, i) => (octet & this.mask[i]) === (ip.address[i] & this.mask[i]),
    );
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
    return new IPAddress(
      Uint8Array.from(addressBytes),
      Uint8Array.from(maskBytes),
    );
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
  CONTEXT: PacketContext;
  PACKET_TYPE: "ETHERNET";
  src: MACAddress;
  dst: MACAddress;
  type: ETHERNET_TYPE;
  data: IP | ARP;
}

export class PacketContext {
  indent: number;
  ctxId: number;
  iface: NetworkInterface | undefined;
  traces: string[];
  logging: boolean;
  constructor(initialTrace: string, logging = true) {
    this.ctxId = Math.floor(Math.random() * 1000000);
    this.indent = 0;
    this.traces = [initialTrace];
    this.logging = logging;
  }
  Log(obj: any, msg: string) {
    if (!this.logging) return
    let name = obj.constructor.name;
    if (obj.LoggerName !== undefined) {
      name = obj.LoggerName();
    }
    console.log(`[${name}]:${"\t".repeat(this.indent)} ${msg}`);
  }

  Indent(tracename: string) {
    // Create new instance of PacketContext
    const ctx = new PacketContext(tracename);
    ctx.indent = this.indent + 1;
    ctx.traces = [...this.traces, tracename];
    ctx.iface = this.iface;
    ctx.logging = this.logging;
    
    return ctx;
  }
}
