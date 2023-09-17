import { EthernetPacket, Network } from "./Network";
import { Device, NetworkInterface } from "./Device";
import { MACAddress, IPAddress } from "./Network";

const network = new Network("Test");

const makeDevice = (name: string, mac: string, ip: string) => {
    const device = new Device(name);
    const iface = new NetworkInterface(MACAddress.fromString(mac), [IPAddress.fromCIDR(ip)]);
    device.RegisterInterface(iface);
    network.RegisterInterface(iface);
    return device;
}

const device1 = makeDevice("device1", "00:00:00:00:00:01", "192.168.0.1/24");
const device2 = makeDevice("device2", "00:00:00:00:00:02", "192.168.0.2/24");

const packet: EthernetPacket = {
    PACKET_TYPE: "ETHERNET",
    src: device1.interfaces[0].mac,
    dst: device2.interfaces[0].mac,
    type: 0x0800,
    data: {
        PACKET_TYPE: "IP",
        src: device1.interfaces[0].ip[0],
        dst: device2.interfaces[0].ip[0],
        protocol: 1,
        data: {
            PACKET_TYPE: "ICMP",
            type: 8,
            code: 0,
            data: "hello world"
        }
    }
}

device1.interfaces[0].Egress(packet);

console.log(`\n\n-- Dump Network Forwarding Table --`)
network.DumpForwardingTable();