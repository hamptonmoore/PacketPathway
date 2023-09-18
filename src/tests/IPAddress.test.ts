import { IPAddress } from "../Protocol";

describe("IP Address Methods", () => {
  it("asSubnet(192.168.0.4/24)", () => {
    const ip = IPAddress.fromCIDR("192.168.0.0/24");
    const subnet = ip.asSubnet();
    expect(subnet.toString()).toBe("192.168.0.0");
    expect(subnet.mask).toEqual(Uint8Array.from([255, 255, 255, 0]));
  });
  it("asSubnet(1.0.6.43/22)", () => {
    const ip = IPAddress.fromCIDR("1.0.6.43/22");
    const subnet = ip.asSubnet();
    expect(subnet.toString()).toBe("1.0.4.0");
    expect(subnet.mask).toEqual(Uint8Array.from([255, 255, 252, 0]));
  });

  it("inNetwork(192.168.0.0/16)", () => {
    const ip = IPAddress.fromCIDR("192.168.0.0/16");
    expect(ip.inNetwork(IPAddress.fromCIDR("1.1.1.1"))).toBe(false);
    expect(ip.inNetwork(IPAddress.fromCIDR("192.168.1.0"))).toBe(true);
    expect(ip.inNetwork(IPAddress.fromCIDR("192.167.0.0"))).toBe(false);
  });
});
