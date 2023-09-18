import { Router } from "./Router";
import { Network } from "./Network";
import { MACAddress, IPAddress, EthernetPacket } from "./Protocol";

export class NetworkInterface {
  device: Router | null;
  mac: MACAddress;
  ip: IPAddress[];
  network: Network | null;
  constructor(mac: MACAddress, ip: IPAddress[]) {
    this.network = null;
    this.device = null;
    this.mac = mac;
    this.ip = ip;
  }

  RegisterDeviceCallback(device: Router) {
    this.device = device;
  }

  RegisterNetworkCallback(network: Network) {
    this.network = network;
  }

  Ingress(packet: EthernetPacket) {
    if (packet.dst === this.mac || packet.dst.isBroadcast()) {
      if (!this.device) {
        throw new Error("Device not registered");
      }
      packet.CONTEXT.iface = this;
      this.device.HandlePacket(packet);
    }
  }

  Egress(packet: EthernetPacket) {
    if (!this.network) {
      throw new Error("Network not registered");
    }

    packet.CONTEXT.iface = this;
    this.network.Forward(packet);
  }
}
