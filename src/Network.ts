import { Router, NetworkInterface } from "./Router";
import { Log } from "./Logger";
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

  Forward(packet: EthernetPacket, iface: NetworkInterface) {
    // Cache source MAC address
    Log(
      this,
      `Received packet from ${packet.src} on eth${this.interfaces.indexOf(
        iface,
      )}`,
    );

    if (
      !this.forwardingTable.has(packet.src) &&
      !packet.src.isBroadcast() &&
      this.forwardingTable.get(packet.src) != iface
    ) {
      Log(
        this,
        `Forwarding DB cache ${packet.src} -> eth${this.interfaces.indexOf(
          iface,
        )}`,
        1,
      );
      this.forwardingTable.set(packet.src, iface);
    }

    const dst = packet.dst;
    const dstIFace = this.forwardingTable.get(dst);
    if (dstIFace) {
      dstIFace.Ingress(packet);
    } else {
      // Send to all interfaces except the one it came from
      this.interfaces
        .filter((dstIface) => dstIface != iface)
        .forEach((dIface) => dIface.Ingress(packet));
    }
  }

  GetInterfaces() {
    return this.interfaces;
  }
}
