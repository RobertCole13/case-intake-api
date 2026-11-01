import { createApp } from "./app";
import { config } from "./config";

createApp().listen(config.port, () => {
  console.log(`case-intake-api listening on port ${config.port}`);
});
