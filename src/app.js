import { initData } from "./storage.js";
import { initTrpgApp } from "./trpg/index.js";

async function bootstrap() {
  try {
    await initData();
    await initTrpgApp();
    console.log("VOCAQuest v2 bootstrapped.");
  } catch (error) {
    console.error("앱 초기화 실패:", error);
  }
}

bootstrap();
