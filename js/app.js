import { initRouter } from "./router.js";
import { store } from "./store.js";

function bootstrap() {
  console.log("RAPSOBOT V2 boot");

  // état initial
  store.user = {
    name: "demo"
  };

  // router
  initRouter();

  // route par défaut
  if (!location.hash) {
    location.hash = "#dashboard";
  }
}

bootstrap();
