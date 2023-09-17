import { MACAddress, IPAddress } from "./Protocol";
import { NetworkInterface } from "./NetworkInterface";

export interface ARPEntry {
  MAC: MACAddress;
  Interface: NetworkInterface;
}

export class ARPTable {
  table: Map<string, ARPEntry>;
  constructor() {
    this.table = new Map();
  }
  Add(ip: IPAddress, entry: ARPEntry) {
    this.table.set(ip.toString(), entry);
  }
  Get(ip: IPAddress) {
    return this.table.get(ip.toString());
  }
  Count(){
    return this.table.size;
  }
  Dump() {
    console.log(`ARP Table:`);
    this.table.forEach((entry, ip) => {
      console.log(`  ${ip} -> ${entry.MAC.toString()}`);
    });
  }
}