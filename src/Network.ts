import { NetworkInterface } from "./NetworkInterface";
import { MACAddress, EthernetPacket } from "./Protocol";

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
    this.forwardingTable.forEach((iface, mac) => {
      console.log(`${mac} -> eth${this.interfaces.indexOf(iface)}`);
    });
  }

  Forward(packet: EthernetPacket) {
    let ctx = packet.CONTEXT;
    const iface = ctx.iface as NetworkInterface;

    // Cache source MAC address
    ctx.Log(
      this,
      `RECV: packet from ${packet.src} on eth${this.interfaces.indexOf(iface)}`,
    );

    if (
      !this.forwardingTable.has(packet.src) &&
      !packet.src.isBroadcast() &&
      this.forwardingTable.get(packet.src) != iface
    ) {
      ctx.Log(
        this,
        `CACHE: FDB ${packet.src} -> eth${this.interfaces.indexOf(iface)}`,
      );
      this.forwardingTable.set(packet.src, iface);
    }

    const dst = packet.dst;
    const dstIFace = this.forwardingTable.get(dst);
    if (dstIFace) {
      packet.CONTEXT = ctx.Indent(`Forwarding to ${dstIFace.mac} on eth${this.interfaces.indexOf(dstIFace)}`);
      dstIFace.Ingress(packet);
    } else {
      // Send to all interfaces except the one it came from
      ctx = ctx.Indent(`Flooding packet on all interfaces except eth${this.interfaces.indexOf(iface)} to find ${dst}`);
      this.interfaces
        .filter((dstIface) => dstIface != iface)
        .forEach((dIface) => {
          packet.CONTEXT = ctx.Indent(`Forwarding to ${dIface.mac} on eth${this.interfaces.indexOf(dIface)}`);
          dIface.Ingress(packet);
        });
    }
  }

  GetInterfaces() {
    return this.interfaces;
  }
}
