import { MikroTikDriver } from "./mikrotik.js";
import { CiscoDriver } from "./cisco.js";

const drivers = new Map();

export function getDriver(device) {

  const vendor =
    String(device.vendor || "mikrotik")
      .toLowerCase()
      .trim();

  if (
    vendor !== "mikrotik" &&
    vendor !== "cisco"
  ) {
    throw new Error(
      `Fabricante no soportado: ${vendor}`
    );
  }

  let driver =
    drivers.get(device.id);

  if (!driver) {

    driver =
      vendor === "cisco"
        ? new CiscoDriver(device)
        : new MikroTikDriver(device);

    drivers.set(
      device.id,
      driver
    );
  }

  return driver;
}

export async function closeDriver(deviceId) {

  const driver = drivers.get(deviceId);

  if (!driver) {
    return;
  }

  try {
    await driver.close();
  } catch (error) {
    console.error(
      `[DRIVER] Error cerrando ${deviceId}:`,
      error?.message || error
    );
  }

  drivers.delete(deviceId);
}

export async function closeAllDrivers() {

  for (const [id, driver] of drivers) {

    try {
      await driver.close();
    } catch (error) {
      console.error(
        `[DRIVER] Error cerrando ${id}:`,
        error?.message || error
      );
    }
  }

  drivers.clear();
}
