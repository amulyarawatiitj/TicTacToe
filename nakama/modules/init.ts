// =============================================================
// Nakama Module Initializer - Entry Point
// =============================================================

// Import the main game module - this will execute and register InitModule
import { InitModule } from "./tictactoe";

// Export for Nakama - CommonJS
module.exports = { InitModule };
