import { RouterOSAPI } from "@fibercom/routeros-api";

export class MikroTikDriver {

  constructor(device) {

    this.device = device;
    this.api = null;

    this.connected = false;
    this.connecting = null;
    this.lastUsed = 0;

    this.timeout = 8000;
  }

  async connect() {

    if (this.connected && this.api) {
      this.lastUsed = Date.now();
      return this;
    }

    if (this.connecting) {
      return await this.connecting;
    }

    this.connecting = this._connect();

    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async _connect() {

    const d = this.device;

    console.log(
      `[MIKROTIK] Conectando a ${d.host}:${d.port}`
    );

    const api = new RouterOSAPI({
      host: d.host,
      user: d.username,
      password: d.password,
      port: Number(d.port),
      secure: Boolean(d.tls),
      timeout: this.timeout
    });

    api.on("error", (err) => {

      console.error(
        `[MIKROTIK ERROR ${d.host}]`,
        err?.stack || err
      );

      this.connected = false;
    });

    api.on("close", () => {

      console.log(
        `[MIKROTIK] Conexión cerrada ${d.host}`
      );

      this.connected = false;
      this.api = null;
    });

    try {

      await api.connect();

      this.api = api;
      this.connected = true;
      this.lastUsed = Date.now();

      console.log(
        `[MIKROTIK] Conectado a ${d.host}`
      );

      return this;

    } catch (error) {

      try {
        await api.close();
      } catch {}

      this.api = null;
      this.connected = false;

      throw error;
    }
  }

  async write(command, params = []) {

    await this.connect();

    if (!this.api) {
      throw new Error(
        "Driver MikroTik no conectado"
      );
    }

    this.lastUsed = Date.now();

    return await this.api.write(
      command,
      params
    );
  }

  async execute(command, params = []) {
    return await this.write(command, params);
  }

  async close() {

    if (!this.api) {
      this.connected = false;
      return;
    }

    const api = this.api;

    this.api = null;
    this.connected = false;

    try {
      await api.close();
    } catch (error) {

      console.error(
        `[MIKROTIK] Error cerrando ${this.device.host}:`,
        error?.message || error
      );
    }
  }

  isConnected() {
    return Boolean(
      this.api &&
      this.connected
    );
  }

  async getIdentity() {

    return await this.write(
      "/system/identity/print"
    );
  }

  async getResource() {

    return await this.write(
      "/system/resource/print"
    );
  }

  async getInterfaces() {

    return await this.write(
      "/interface/print"
    );
  }

  async getMonitor() {

    await this.connect();

    const [
      resource,
      interfaces
    ] = await Promise.all([
      this.getResource(),
      this.getInterfaces()
    ]);

    return {

      resource:
        Array.isArray(resource)
          ? resource
          : [],

      interfaces:
        Array.isArray(interfaces)
          ? interfaces
          : []
    };
  }

  async getIpAddresses() {

    return await this.write(
      "/ip/address/print"
    );
  }

  async getRoutes() {

    return await this.write(
      "/ip/route/print"
    );
  }

  async getFirewall() {

    return await this.write(
      "/ip/firewall/filter/print"
    );
  }

  async getDhcpLeases() {

    return await this.write(
      "/ip/dhcp-server/lease/print"
    );
  }

  async getLogs() {

    return await this.write(
      "/log/print"
    );
  }

  async getHotspot() {

    const [
      servers,
      profiles,
      users
    ] = await Promise.all([

      this.write(
        "/ip/hotspot/print"
      ),

      this.write(
        "/ip/hotspot/user/profile/print"
      ),

      this.write(
        "/ip/hotspot/user/print"
      )
    ]);

    return {

      servers:
        Array.isArray(servers)
          ? servers
          : [],

      profiles:
        Array.isArray(profiles)
          ? profiles
          : [],

      users:
        Array.isArray(users)
          ? users
          : []
    };
  }

  async getHotspotVouchers() {

    return await this.write(
      "/ip/hotspot/user/print"
    );
  }

  async createHotspotVoucher({
    username,
    password,
    profile
  }) {

    return await this.write(
      "/ip/hotspot/user/add",
      [
        `name=${username}`,
        `password=${password}`,
        `profile=${profile}`,
        "disabled=no",
        "comment=MikroTik Manager Voucher"
      ]
    );
  }

  async removeHotspotActive(activeId) {

    return await this.write(
      "/ip/hotspot/active/remove",
      [
        `=.id=${activeId}`
      ]
    );
  }

  async getHotspotActive() {

    return await this.write(
      "/ip/hotspot/active/print"
    );
  }

  async deleteHotspotVoucher(voucherId) {

    return await this.write(
      "/ip/hotspot/user/remove",
      [
        `=.id=${voucherId}`
      ]
    );
  }

  async setHotspotVoucherStatus(
    voucherId,
    disabled
  ) {

    return await this.write(
      "/ip/hotspot/user/set",
      [
        `=.id=${voucherId}`,
        `disabled=${disabled ? "yes" : "no"}`
      ]
    );
  }

  async createHotspotProfile({
    name,
    sharedUsers,
    sessionTimeout
  }) {

    const params = [
      `name=${name}`,
      `shared-users=${sharedUsers}`
    ];

    if (sessionTimeout) {
      params.push(
        `session-timeout=${sessionTimeout}`
      );
    }

    return await this.write(
      "/ip/hotspot/user/profile/add",
      params
    );
  }
}
