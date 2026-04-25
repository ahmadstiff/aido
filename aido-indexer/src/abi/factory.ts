import { parseAbiItem } from "viem";

export const daoCreatedEvent = parseAbiItem(
  "event DaoCreated(address indexed creator, address indexed governor, address indexed timelock, address token, string name, string metadataURI)",
);
