export type Country =
  | "Argentina"
  | "Belgium"
  | "Brazil"
  | "Cape Verde"
  | "Croatia"
  | "Egypt"
  | "England"
  | "France"
  | "Georgia"
  | "Germany"
  | "Morocco"
  | "Norway"
  | "Poland"
  | "Portugal"
  | "South Korea"
  | "Spain"
  | "Uruguay";

export type Character = {
  id: string;
  name: string;
  country: Country;
  number: number;
  primary: string;
  secondary: string;
  shorts: string;
  skin: string;
  hair: string;
  beard?: string;
};

export const CHARACTERS: Character[] = [
  { id: "vinny_juicebox", name: "Vinny Juicebox", country: "Brazil", number: 7, primary: "#1f9d55", secondary: "#ffd21f", shorts: "#1346a8", skin: "#8a5a3b", hair: "#1b120e" },
  { id: "mmmbop_pe", name: "MmmBop-pé", country: "France", number: 10, primary: "#244ecf", secondary: "#ffffff", shorts: "#d22b2b", skin: "#7b4a32", hair: "#15100d" },
  { id: "viking_corncob", name: "The Viking Corncob", country: "Norway", number: 9, primary: "#c8102e", secondary: "#ffffff", shorts: "#003087", skin: "#f1c7a4", hair: "#d8a64a" },
  { id: "dude_sellingham", name: "Dude Selling-ham", country: "England", number: 10, primary: "#ffffff", secondary: "#c8102e", shorts: "#17264f", skin: "#6b3f2a", hair: "#17100c" },
  { id: "hairy_candycane", name: "Hairy Candy-cane", country: "England", number: 9, primary: "#ffffff", secondary: "#c8102e", shorts: "#17264f", skin: "#efd0b4", hair: "#8b5a2b" },
  { id: "de_brainiac", name: "Kevin De Brainiac", country: "Belgium", number: 10, primary: "#f5c400", secondary: "#d71920", shorts: "#151515", skin: "#f3c7a3", hair: "#d6a33f" },
  { id: "mo_saladbowl", name: "Mo Salad-bowl", country: "Egypt", number: 10, primary: "#ce1126", secondary: "#ffffff", shorts: "#111111", skin: "#6a3f2a", hair: "#14100d", beard: "#14100d" },
  { id: "rodri_gocart", name: "Rodri-go-cart", country: "Spain", number: 16, primary: "#aa151b", secondary: "#f1bf00", shorts: "#1f3c88", skin: "#d9a87d", hair: "#24160f" },
  { id: "antfarm_greaseman", name: "Ant-farm Grease-man", country: "France", number: 7, primary: "#244ecf", secondary: "#ffffff", shorts: "#d22b2b", skin: "#edc09b", hair: "#3a2417" },
  { id: "lambchop_yampot", name: "Lamb Chop Yam-pot", country: "Spain", number: 10, primary: "#aa151b", secondary: "#f1bf00", shorts: "#1f3c88", skin: "#d59a6a", hair: "#24160f" },
  { id: "bookayo", name: "Boo-Kayo Soccer-ball", country: "England", number: 7, primary: "#ffffff", secondary: "#c8102e", shorts: "#17264f", skin: "#5f3724", hair: "#14100d" },
  { id: "crispy_penaldo", name: "Crispy Penaldo", country: "Portugal", number: 7, primary: "#006600", secondary: "#ff0000", shorts: "#b8860b", skin: "#d49a6a", hair: "#21140e" },
  { id: "lawan_doughnut", name: "Robert Lawan-doughnut", country: "Poland", number: 9, primary: "#ffffff", secondary: "#dc143c", shorts: "#dc143c", skin: "#efc7a4", hair: "#7b5a35" },
  { id: "smart_inez", name: "Low-Tarot Smart-inez", country: "Argentina", number: 22, primary: "#75aadb", secondary: "#ffffff", shorts: "#111111", skin: "#e2aa7a", hair: "#20130e" },
  { id: "barnyard_silver", name: "Barnyard Silver", country: "Portugal", number: 10, primary: "#006600", secondary: "#ff0000", shorts: "#b8860b", skin: "#c58962", hair: "#17100c" },
  { id: "lionel_pessi", name: "Lionel Pessi", country: "Argentina", number: 10, primary: "#75aadb", secondary: "#ffffff", shorts: "#111111", skin: "#d69b6a", hair: "#2b190f", beard: "#2b190f" },
  { id: "floorcleaner_hurts", name: "Floor-cleaner Hurts", country: "Germany", number: 10, primary: "#ffffff", secondary: "#111111", shorts: "#111111", skin: "#d3a071", hair: "#5f3a21" },
  { id: "jamal_mooseala", name: "Jamal Moose-ala", country: "Germany", number: 10, primary: "#ffffff", secondary: "#111111", shorts: "#111111", skin: "#7b4a32", hair: "#14100d" },
  { id: "declan_friedrice", name: "Declan Fried-Rice", country: "England", number: 4, primary: "#ffffff", secondary: "#c8102e", shorts: "#17264f", skin: "#f0c9a8", hair: "#7a4a25" },
  { id: "fedora_vaultverde", name: "Fedora Vault-verde", country: "Uruguay", number: 15, primary: "#7bcdf2", secondary: "#111111", shorts: "#111111", skin: "#e0a677", hair: "#4c2b18" },
  { id: "blunder_hairnandes", name: "Blunder Hair-nandes", country: "Portugal", number: 8, primary: "#006600", secondary: "#ff0000", shorts: "#b8860b", skin: "#d69a6a", hair: "#18100c" },
  { id: "achef_bigmeanie", name: "A-Chef Big-Meanie", country: "Morocco", number: 7, primary: "#c1272d", secondary: "#006233", shorts: "#006233", skin: "#8b5a3c", hair: "#17100c" },
  { id: "allinson_baker", name: "All-in-son Baker", country: "Brazil", number: 1, primary: "#1f9d55", secondary: "#ffd21f", shorts: "#1346a8", skin: "#d59a6a", hair: "#4b2b18", beard: "#4b2b18" },
  { id: "hungryman_son", name: "Hungry-man Son", country: "South Korea", number: 7, primary: "#ffffff", secondary: "#c60c30", shorts: "#003478", skin: "#d6a27b", hair: "#11100e" },
  { id: "lukewarm_modrich", name: "Lukewarm Mod-rich", country: "Croatia", number: 10, primary: "#ffffff", secondary: "#e32636", shorts: "#171796", skin: "#e8b989", hair: "#c49a55" },
  { id: "older_guard", name: "Martian Older-guard", country: "Norway", number: 8, primary: "#c8102e", secondary: "#ffffff", shorts: "#003087", skin: "#f1c7a4", hair: "#d4a24a" },
  { id: "endzone_furnandes", name: "Endzone Fur-nandes", country: "Argentina", number: 8, primary: "#75aadb", secondary: "#ffffff", shorts: "#111111", skin: "#d69b6a", hair: "#20130e" },
  { id: "kneehigh_williams", name: "Knee-high Will-i-ams", country: "Spain", number: 17, primary: "#aa151b", secondary: "#f1bf00", shorts: "#1f3c88", skin: "#6b3f2a", hair: "#15100d" },
  { id: "keyboard_spaghetti", name: "Keyboard Kvarat-spaghetti", country: "Georgia", number: 7, primary: "#ffffff", secondary: "#ff0000", shorts: "#111111", skin: "#e1ad82", hair: "#2a180f" },
  { id: "raffy_lizardo", name: "Raffy Lizard-o", country: "Portugal", number: 17, primary: "#006600", secondary: "#ff0000", shorts: "#b8860b", skin: "#d8a070", hair: "#22140e" },
  { id: "william_saliva", name: "William Saliva", country: "France", number: 4, primary: "#244ecf", secondary: "#ffffff", shorts: "#d22b2b", skin: "#8a5a3b", hair: "#15100d" },
  { id: "micdrop_mayo", name: "Mic-drop Mayonnaise", country: "France", number: 1, primary: "#244ecf", secondary: "#ffffff", shorts: "#d22b2b", skin: "#4a2c1f", hair: "#120d0a" },
  { id: "vozinha_lasagna", name: "Vozinha-lasagna", country: "Cape Verde", number: 1, primary: "#1f63c8", secondary: "#ffffff", shorts: "#cf2027", skin: "#7d4b32", hair: "#17100c", beard: "#17100c" },
  { id: "neigh_mar", name: "Neigh-mar", country: "Brazil", number: 10, primary: "#1f9d55", secondary: "#ffd21f", shorts: "#1346a8", skin: "#9a6240", hair: "#20130e" },
  { id: "gooseman_dumbbelle", name: "Goose-man Dumbbell-e", country: "France", number: 7, primary: "#244ecf", secondary: "#ffffff", shorts: "#d22b2b", skin: "#6f422c", hair: "#15100d", beard: "#15100d" },
  { id: "michael_old_lease", name: "Michael Old-lease", country: "France", number: 11, primary: "#244ecf", secondary: "#ffffff", shorts: "#d22b2b", skin: "#e2ad82", hair: "#7a4a25" }
];

export const TOURNAMENT_SIZES = [2, 4, 8, 16, 32] as const;
export type TournamentSize = (typeof TOURNAMENT_SIZES)[number];

export const GOAL_ZONES = ["TL", "TM", "TR", "LL", "LM", "LR"] as const;
export type GoalZone = (typeof GOAL_ZONES)[number];

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function cleanName(raw: unknown): string {
  const text = String(raw ?? "").replace(/[^a-zA-Z0-9 _.-]/g, "").trim();
  return (text || "Player").slice(0, 16);
}

export function nextTournamentSize(humanCount: number): TournamentSize {
  for (const size of TOURNAMENT_SIZES) {
    if (humanCount <= size) return size;
  }
  return 32;
}
