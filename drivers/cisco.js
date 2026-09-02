import { Client } from "ssh2";

export class CiscoDriver {

  constructor(device) {

    this.device = device;

    this.client = null;
    this.stream = null;

    this.connected = false;
    this.connecting = null;

    this.timeout = 10000;
  }

  async connect() {

    if (this.connected && this.client) {
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
      `[CISCO] Conectando a ${d.host}:${d.port || 22}`
    );

    return new Promise((resolve, reject) => {

      const client = new Client();

      let settled = false;

      const fail = (error) => {

        if (settled) return;

        settled = true;

        this.connected = false;
        this.client = null;
        this.stream = null;

        reject(error);
      };

      const timer = setTimeout(() => {

        try {
          client.end();
        } catch {}

        fail(
          new Error(
            `Timeout conectando a Cisco ${d.host}`
          )
        );

      }, this.timeout);

      client
        .on("ready", () => {

          clearTimeout(timer);

          this.client = client;
          this.connected = true;

          console.log(
            `[CISCO] Conectado a ${d.host}`
          );

          settled = true;

          resolve(this);
        })

        .on("error", (error) => {

          clearTimeout(timer);

          console.error(
            `[CISCO ERROR ${d.host}]`,
            error?.message || error
          );

          fail(error);
        })

        .on("close", () => {

          this.connected = false;
          this.client = null;
          this.stream = null;

          console.log(
            `[CISCO] Conexión cerrada ${d.host}`
          );
        })

        .connect({

          host: d.host,

          port:
            Number(d.port) ||
            22,

          username:
            d.username,

          password:
            d.password,

          readyTimeout:
            this.timeout,

          tryKeyboard: true

        });

    });
  }

  async close() {

    if (!this.client) {

      this.connected = false;
      return;

    }

    const client =
      this.client;

    this.client = null;
    this.connected = false;
    this.stream = null;

    try {
      client.end();
    } catch {}

  }

  isConnected() {

    return Boolean(
      this.client &&
      this.connected
    );
  }

  async exec(command) {

    await this.connect();

    if (!this.client) {
      throw new Error(
        "Cisco no está conectado"
      );
    }

    return new Promise((resolve, reject) => {

      let output = "";

      this.client.exec(
        command,
        {
          pty: false
        },
        (error, stream) => {

          if (error) {
            reject(error);
            return;
          }

          stream.on(
            "data",
            (data) => {
              output += data.toString();
            }
          );

          stream.stderr.on(
            "data",
            (data) => {
              output += data.toString();
            }
          );

          stream.on(
            "close",
            () => {
              resolve(output.trim());
            }
          );

        }
      );

    });
  }

  async getIdentity() {

    const output =
      await this.exec(
        "show version | include uptime"
      );

    return {
      output
    };
  }

  async getResource() {

    const output =
      await this.exec(
        "show processes cpu | include CPU utilization"
      );

    return {
      output
    };
  }

  async getInterfaces() {

    const output =
      await this.exec(
        "show interfaces"
      );

    return {
      output
    };
  }

  async getIpAddresses() {

    const output =
      await this.exec(
        "show ip interface brief"
      );

    return {
      output
    };
  }

  async getRoutes() {

    const output =
      await this.exec(
        "show ip route"
      );

    return {
      output
    };
  }

  async getFirewall() {

    const output =
      await this.exec(
        "show access-lists"
      );

    return {
      output
    };
  }

  async getLogs() {

    const output =
      await this.exec(
        "show logging"
      );

    return {
      output
    };
  }

  async getMonitor() {

    const [
      identity,
      resource,
      interfaces,
      ip,
      routes
    ] = await Promise.all([

      this.getIdentity(),

      this.getResource(),

      this.getInterfaces(),

      this.getIpAddresses(),

      this.getRoutes()

    ]);

    return {

      identity,

      resource,

      interfaces,

      ip,

      routes

    };
  }

}
