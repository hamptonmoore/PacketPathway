import { RouteTable } from "../RouteTable";
import { NetworkInterface } from "../NetworkInterface";
import { IPAddress, MACAddress } from "../Protocol";

describe("RouteTable", () => {
  const table = new RouteTable();
  const interface1 = new NetworkInterface(
    MACAddress.fromString("00:00:00:00:00:01"),
    [IPAddress.fromCIDR("192.168.0.2/24")],
  );
  table.AddSubnet(interface1.ip[0].asSubnet(), interface1);

  it("Basic functionality", () => {
    expect(table.Count()).toBe(1);

    const entry1 = table.Get(IPAddress.fromCIDR("192.168.0.250"));
    expect(entry1?.Interface).toBe(interface1);
    expect(entry1?.NextHop).toBe(undefined);

    const entry2 = table.Get(IPAddress.fromCIDR("10.0.0.0/8"));
    expect(entry2).toBe(undefined);
  });

  it("Add default route", () => {
    table.AddRoute(
      IPAddress.fromCIDR("0.0.0.0/0"),
      interface1,
      IPAddress.fromCIDR("192.168.0.1"),
    );

    expect(table.Count()).toBe(2);

    const entry1 = table.Get(IPAddress.fromCIDR("1.1.1.1"));
    expect(entry1?.Interface).toBe(interface1);
    expect(entry1?.NextHop?.toString()).toBe("192.168.0.1");

    const entry2 = table.Get(IPAddress.fromCIDR("192.168.0.250"));
    expect(entry2?.Interface).toBe(interface1);
    expect(entry2?.NextHop).toBe(undefined);
  });
});
