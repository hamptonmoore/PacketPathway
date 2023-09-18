import { ARPTable } from "../ArpTable";
import { NetworkInterface } from "../NetworkInterface";
import { IPAddress, MACAddress } from "../Protocol";

describe("ARPTable", () => {
  it("Basic functionality", () => {
    const table = new ARPTable();
    const interface1 = new NetworkInterface(
      MACAddress.fromString("00:00:00:00:00:01"),
      [IPAddress.fromCIDR("192.168.0.1/24")],
    );
    table.Add(interface1.ip[0], { MAC: interface1.mac, Interface: interface1 });

    const interface2 = new NetworkInterface(
      MACAddress.fromString("00:00:00:00:00:02"),
      [IPAddress.fromCIDR("1.2.3.4/32")],
    );
    table.Add(interface2.ip[0], { MAC: interface2.mac, Interface: interface2 });

    expect(table.Count()).toBe(2);

    const entry1 = table.Get(interface1.ip[0]);
    expect(entry1?.MAC.toString()).toBe("00:00:00:00:00:01");
    expect(entry1?.Interface).toBe(interface1);

    const entry2 = table.Get(interface2.ip[0]);
    expect(entry2?.MAC.toString()).toBe("00:00:00:00:00:02");
    expect(entry2?.Interface).toBe(interface2);

    const entry3 = table.Get(IPAddress.fromCIDR("10.0.0.0/8"));
    expect(entry3).toBe(undefined);
  });
});
