import { NetworkInterface } from "./NetworkInterface";
import { IPAddress } from "./Protocol";

export interface RouteEntry {
  NextHop: IPAddress | undefined;
  Interface: NetworkInterface;
}

export class RouteTable {
  table: Map<IPAddress, RouteEntry>;
  constructor() {
    this.table = new Map();
  }

  AddSubnet(subnet: IPAddress, Interface: NetworkInterface) {
    this.table.set(subnet.asSubnet(), {
      NextHop: undefined,
      Interface: Interface,
    });
  }

  AddRoute(route: IPAddress, Interface: NetworkInterface, nexthop: IPAddress) {
    this.table.set(route.asSubnet(), {
      NextHop: nexthop,
      Interface: Interface,
    });
  }

  Get(ip: IPAddress) {
    const routes = Array.from(this.table.keys()).filter((subnet) => {
      return subnet.inNetwork(ip);
    });

    // Get most specific route
    if (!routes || routes.length === 0) {
      return undefined;
    }

    routes.sort((a, b) => {
      return b.mask.reduce((acc, cur) => acc + cur, 0) - a.mask.reduce((acc, cur) => acc + cur, 0);
    });

    return this.table.get(routes[0]);
  }

  Count() {
    return this.table.size;
  }
}