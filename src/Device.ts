import { Log } from "./Logger";
import { EthernetPacket } from "./Network"
import { IPAddress, MACAddress, Network, IP, ETHERNET_TYPE, IP_PROTOCOL, ICMP } from "./Network"
export class Device {
    interfaces: NetworkInterface[];
    hostname: string;

    constructor(hostname: string) {
        this.hostname = hostname;
        this.interfaces = [];
    }

    LoggerName() {
        return this.hostname;
    }

    RegisterInterface(iface: NetworkInterface) {
        this.interfaces.push(iface);
        iface.RegisterDeviceCallback(this);
    }

    HandlePacket(packet: EthernetPacket, iface: NetworkInterface) {
        Log(this, `received packet on interface ${iface.mac}`);
        switch (packet.type) {
            case ETHERNET_TYPE.IP:
                this.HandleIP(packet.data as IP, iface, packet);
                break;
        }
    }

    HandleIP(packet: IP, iface: NetworkInterface, ethPacket: EthernetPacket) {
        switch (packet.protocol) {
            case IP_PROTOCOL.ICMP:
                this.HandleICMP(packet.data as ICMP, iface, ethPacket);
                break;
        }
    }

    HandleICMP(packet: ICMP, iface: NetworkInterface, ethPacket: EthernetPacket) {
        if (packet.type === 8) {
            Log(this, `received ICMP echo request from ${(ethPacket.data as IP).src.toString()} on interface ${iface.mac}`)
            const reply: EthernetPacket = {
                PACKET_TYPE: "ETHERNET",
                src: iface.mac,
                dst: ethPacket.src,
                type: ETHERNET_TYPE.IP,
                data: {
                    PACKET_TYPE: "IP",
                    src: iface.ip[0],
                    dst: (ethPacket.data as IP).src,
                    protocol: IP_PROTOCOL.ICMP,
                    data: {
                        PACKET_TYPE: "ICMP",
                        type: 0,
                        code: 0,
                        data: packet.data
                    }
                }
            }
            iface.Egress(reply);
        }
        if (packet.type === 0) {
            Log(this, `received ICMP echo reply from ${(ethPacket.data as IP).src.toString()} on interface ${iface.mac}`)
        }

    }
}

export class NetworkInterface {
    device: Device | null;
    mac: MACAddress;
    ip: IPAddress[];
    network: Network | null;
    constructor(mac: MACAddress, ip: IPAddress[]) {
        this.network = null; 
        this.device = null;
        this.mac = mac;
        this.ip = ip;
    }

    RegisterDeviceCallback(device: Device) {
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
            this.device.HandlePacket(packet, this);
        }
    }

    Egress(packet: EthernetPacket) {
        if (!this.network) {
            throw new Error("Network not registered");
        }

        this.network.Forward(packet, this);
    }
}
