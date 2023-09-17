import { Network } from "../Network";
import {
  MACAddress,
  IPAddress,
  EthernetPacket,
  ARP,
  ARP_OPERATION,
  PacketContext,
} from "../Protocol";
import { Router, NetworkInterface } from "../Router";

const makeDevice = (name: string, mac: string, ip: string, network: Network) => {
  const device = new Router(name);
  const iface = new NetworkInterface(MACAddress.fromString(mac), [
    IPAddress.fromCIDR(ip),
  ]);
  device.RegisterInterface(iface);
  network.RegisterInterface(iface);
  return device;
};

describe('Basic Network Protocols', () => {
  it("ARP", ()=> {
    const network = new Network("Test");
    const devices = [];
  
    const device1 = makeDevice("Router1", "00:00:00:00:00:01", "192.168.0.1/24", network);
    const device2 = makeDevice("Router2", "00:00:00:00:00:02", "192.168.0.2/24", network);
    const device3 = makeDevice("Router3", "00:00:00:00:00:03", "192.168.0.3/24", network);
    
    devices.push(device1);
    devices.push(device2);
    devices.push(device3);

    device1.SendArpRequest(IPAddress.fromCIDR("192.168.0.2"), new PacketContext("Send ARP Request 192.168.0.2", false));
    device1.SendArpRequest(IPAddress.fromCIDR("192.168.0.3"), new PacketContext("Send ARP Request 192.168.0.3", false));
    
    expect(device1.arpTable.Count()).toBe(2);
    expect(device2.arpTable.Count()).toBe(1);
    expect(device3.arpTable.Count()).toBe(1);

    expect(device1.arpTable.Get(IPAddress.fromCIDR("192.168.0.2"))?.MAC.toString()).toBe("00:00:00:00:00:02");
    expect(device1.arpTable.Get(IPAddress.fromCIDR("192.168.0.3"))?.MAC.toString()).toBe("00:00:00:00:00:03");

    expect(device2.arpTable.Get(IPAddress.fromCIDR("192.168.0.1"))?.MAC.toString()).toBe("00:00:00:00:00:01");
    expect(device3.arpTable.Get(IPAddress.fromCIDR("192.168.0.1"))?.MAC.toString()).toBe("00:00:00:00:00:01");

  })

})