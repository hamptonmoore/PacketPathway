import { Network } from "./Network";
import {
  MACAddress,
  IPAddress,
  EthernetPacket,
  ARP,
  ARP_OPERATION,
  PacketContext,
  IP_PROTOCOL,
} from "./Protocol";
import { Router } from "./Router";
import { NetworkInterface } from "./NetworkInterface";

const network = new Network("Test");

const makeDevice = (name: string, mac: string, ip: string) => {
  const device = new Router(name);
  const iface = new NetworkInterface(MACAddress.fromString(mac), [
    IPAddress.fromCIDR(ip),
  ]);
  device.RegisterInterface(iface);
  network.RegisterInterface(iface);
  return device;
};

const devices = [];

const device1 = makeDevice("Router1", "00:00:00:00:00:01", "192.168.0.1/24");
const device2 = makeDevice("Router2", "00:00:00:00:00:02", "192.168.0.2/24");
const device3 = makeDevice("Router3", "00:00:00:00:00:03", "192.168.0.3/24");

devices.push(device1);
devices.push(device2);
devices.push(device3);

// device1.interfaces[0].Egress(arpPacket);
// device1.SendArpRequest(IPAddress.fromCIDR("192.168.0.2"), new PacketContext("Send ARP Request 192.168.0.2"));
// device1.SendArpRequest(IPAddress.fromCIDR("192.168.0.3"), new PacketContext("Send ARP Request 192.168.0.3"));
let ctx = new PacketContext("Send ICMP Echo Request from 192.168.0.1 to 192.168.0.2");
device1.SendIPPacket(
  {
    PACKET_TYPE: "IP",
    dst: IPAddress.fromCIDR("192.168.0.2"),
    src: device1.interfaces[0].ip[0],
    protocol: IP_PROTOCOL.ICMP,
    data: {
      PACKET_TYPE: "ICMP",
      type: 8,
      code: 0,
      data: "Hello, World!",
    },
    ttl: 64,
  },
  ctx
);

ctx = new PacketContext("Send Another ICMP Echo Request from 192.168.0.1 to 192.168.0.2");
device1.SendIPPacket(
  {
    PACKET_TYPE: "IP",
    dst: IPAddress.fromCIDR("192.168.0.2"),
    src: device1.interfaces[0].ip[0],
    protocol: IP_PROTOCOL.ICMP,
    data: {
      PACKET_TYPE: "ICMP",
      type: 8,
      code: 0,
      data: "Ping 2",
    },
    ttl: 64,
  },
  ctx
);

console.log(
  "\n\nAll network effects from the ARP request should be complete by now.",
);
console.log("We can now look at the state of the network.");

console.log(`\n-- Dump Network Forwarding Table --`);
network.DumpForwardingTable();

console.log(`\n-- Dump Device ARP Tables --`);
devices.forEach((device) => {
  console.log(`\n-- ${device.hostname} --`);
  device.arpTable.Dump();
});
