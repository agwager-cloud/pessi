import Phaser from "phaser";
import { CHARACTERS, type Character } from "@pessi/shared";
import { Net } from "../net/Net";
import { playMusic, playTackleImpactSequence, preloadAudio, stopSfxChannel } from "../audio/audio";
import type { PlayerRecord, PublicState } from "../types";
import { addButton, addTopBar, drawArcadeBall, drawFootballer, drawPitch, getPlayer, playerLabel, W, H } from "../ui/ui";
import { routeScene } from "../ui/routing";

const BASE_FLOP_LINES = [
  "Penalty area? More like pain-alty area!",
  "My dignity just got a straight red card.",
  "VAR confirms: maximum drama, minimum contact.",
  "Contact level: butterfly. Drama level: World Cup final.",
  "The shin pads are demanding danger pay.",
  "My boots are calling their agent.",
  "The grass clipped me emotionally.",
  "I came for a penalty and got a physics lesson.",
  "My suffering has qualified for the knockouts.",
  "The pain has topped the group on goal difference.",
  "That roll had more rotations than a tactics board.",
  "Somebody check if my pride is offside.",
  "The ref said play on. My ego said log off.",
  "World Cup? More like World OOF.",
  "That slide tackle had more sauce than a stadium pie.",
  "The commentator just swallowed the microphone.",
  "Even the grass asked for a substitution.",
  "Manager, sub me off into a comfy chair.",
  "The turf has been nominated for Best Supporting Villain.",
  "The crowd gasped, then gave it a 9.8.",
  "My legs are buffering.",
  "The touchline staff are reviewing my vibes.",
  "FIFA just deducted style points from gravity.",
  "The ball has requested personal space.",
  "I have been fouled by the concept of football.",
  "My knee just requested a transfer.",
  "I'm appealing to every confederation.",
  "The boots have split from the player by mutual consent.",
  "Pain FC has signed me on deadline day.",
  "My dignity has dropped to League Two.",
  "The stadium hot dog felt that one.",
  "That slide tackle came with downloadable chaos.",
  "I'm not rolling. I'm time-wasting artistically.",
  "Put that flop in the Louvre next to the Golden Boot.",
  "My suffering has a five-year contract.",
  "Even the corner flag looked concerned.",
  "I need a replay, a snack, and a tiny blanket.",
  "My ball control has become ground control.",
  "The penalty spot moved away out of respect.",
  "That was less tackle, more lawn-based betrayal.",
  "I've taken more contact from a light breeze.",
  "The keeper sneezed and I entered low orbit.",
  "The bootlaces are filing a complaint.",
  "My calves are holding a team meeting.",
  "Pain is temporary. Memes are forever.",
  "Send help: my vibes are cramping.",
  "The ref checked VAR and found only nonsense.",
  "That was a professional-level silly collision.",
  "Achievement unlocked: dramatic tumble.",
  "The crowd asked for popcorn.",
  "I was clearly fouled by gravity.",
  "That slide tackle had a boarding pass.",
  "Somebody tell the scoreboard I need emotional support.",
  "My touch was heavy. My landing was theatrical.",
  "That roll was worth three bonus medals.",
  "Even the net whispered, 'oof'.",
  "The World Cup trophy looked away.",
  "Football heritage has been mildly bruised.",
  "I'm currently negotiating with the floor.",
  "That contact was 1% football, 99% opera.",
  "I'm not hurt. I'm performing modern football.",
  "Book the grass for simulation.",
  "My suffering has gone to extra time.",
  "VAR has ruled: hilarious but legal.",
  "The commentator needs a thesaurus for 'ouch'.",
  "The keeper tackled my confidence.",
  "My ankles have unfollowed me.",
  "The rolling continues until morale improves.",
  "My boots are now in separate postcodes.",
  "The turf just won Player of the Match.",
  "The fourth official added seven minutes of embarrassment.",
  "The linesman flagged my dignity offside.",
  "This flop has Champions League music.",
  "My legs just requested half-time oranges.",
  "Pain-alty shootout loading...",
  "That tackle was sponsored by chaos.",
  "The grass gave me a yellow card for overacting.",
  "My balance has left for a better contract.",
  "Sell my boots to fund the replay.",
  "The physio has prescribed one orange slice and applause.",
  "My xG just became xOof.",
  "The ball rolled away to avoid the paperwork.",
  "That was a tackle with sequel potential.",
  "My hamstring has entered witness protection.",
  "I regret every step since kickoff.",
  "The stadium announcer has listed me as missing possession.",
  "My first touch was fine. My second touch was Earth.",
  "This is not diving. This is aquatic football.",
  "The goalkeeper brought a tackle to a drama fight.",
  "My pain is wearing tiny football boots.",
  "Even the mascots are requesting VAR counselling.",
  "The pitch and I are now in a committed rivalry.",
  "That tackle sent my confidence to the bench.",
  "I'm rolling until the transfer window opens.",
  "My studs have resigned effective immediately.",
  "The crowd is chanting 'Oscar! Oscar!' again.",
  "I have achieved peak theatrical suffering.",
  "The keeper won the ball, my pride, and a small souvenir.",
  "My balance was loaned out and never returned.",
  "The penalty box has become a tiny soap opera.",
  "Somebody give the grass a red card.",
  "My run-up has turned into a tumble-down.",
  "That challenge had more spin than a post-match interview.",
  "The ball said, 'I'm not involved in this drama.'",
  "My suffering needs its own highlight reel.",
  "The replay angle has filed for extra storage.",
  "I demand a free kick, a fruit box, and justice.",
  "This flop has officially entered football folklore.",
  "My skeleton just requested a half-time team talk.",
  "Somebody tell the tactics board I am the new formation.",
  "My pride has gone down holding its ankle and a smoothie.",
  "That challenge had more crunch than stadium chips.",
  "The grass just shouted, 'Welcome home!'",
  "My dribble turned into a carpet inspection.",
  "I have become one with the penalty box.",
  "The replay will need slow motion and a sympathy violin.",
  "My boots are looking for new management.",
  "The ball is pretending it never knew me.",
  "That slide tackle came with a receipt and emotional damage.",
  "My touch map is now just a circle around the floor.",
  "The stadium DJ just played the national anthem of OOF.",
  "My balance has entered the transfer portal.",
  "The pitch has asked for my autograph in grass stains.",
  "That flop deserves its own postage stamp.",
  "The medical staff brought popcorn instead of spray.",
  "I have been tackled into next season's fixture list.",
  "The ref added stoppage time for my feelings.",
  "My shinpads are writing a strongly worded email.",
  "The crossbar just winced from second-hand embarrassment.",
  "My run-up is now a roll-up.",
  "The penalty spot has filed a missing person report.",
  "I am not on the ground. I am studying the turf.",
  "That tumble had more drama than deadline day.",
  "Somebody check the VAR monitor for comedy settings.",
  "The stadium nachos stood for a minute's silence.",
  "Gravity has been named assistant referee.",
  "My boots left skid marks and a resignation letter.",
  "The tackle was tiny. The theatre was enormous.",
  "My confidence has been subbed off for treatment.",
  "The goalkeeper's slide had a soundtrack and a sequel.",
  "The floor and I are exchanging team shirts.",
  "My ankle socks have declared themselves unavailable.",
  "That roll was powered by pure football nonsense.",
  "I went for glory and found geology.",
  "My dignity is currently lying in an offside position.",
  "The linesman's flag is waving for emotional support.",
  "The ball has changed its emergency contact.",
  "The boot room is holding a candlelight vigil.",
  "The fans paid for penalties and got interpretive dance.",
  "I have fallen, and my xG cannot get up.",
  "That collision had Sunday league energy and opera vocals.",
  "My studs are still spinning in the group stage.",
  "My knees are calling a players-only meeting.",
  "The turf has claimed another World Cup dream.",
  "I am legally changing my position to horizontal winger.",
  "The scoreboard is showing sympathy in extra-large font.",
  "That tackle was a podcast with grass stains.",
  "My ribs are applauding sarcastically.",
  "The dugout has requested a replay and a blanket.",
  "The ref said advantage. I said ambulance of feelings.",
  "My football IQ just bounced twice and rolled away.",
  "The corner flag is pretending not to laugh.",
  "This was less contact sport, more contact comedy.",
  "The turf just nutmegged my self-respect.",
  "My game plan now involves lying very still and pouting.",
  "I asked for a penalty, not a grass sandwich.",
  "That was a crunching tackle on my weekend plans.",
  "The keeper slid in like a shopping trolley with ambition.",
  "My run had pace, power, and a sudden furniture ending.",
  "The audience has voted: maximum flop, maximum flavour.",
  "I require a stretcher for my reputation.",
  "The commentary box is running out of exclamation marks.",
  "The boot sponsor has entered crisis talks.",
  "The fourth official has announced six minutes of silliness.",
  "The goalposts are giggling. Very unprofessional.",
  "My shooting foot has requested witness protection.",
  "My soul just dived the wrong way.",
  "The keeper collected the ball and my personal confidence.",
  "The grass has offered me a long-term lease.",
  "I'm not wasting time. I'm marinating in injustice.",
  "The replay has been classified as slapstick football.",
  "The crowd has started chanting for my shoelace.",
  "My first touch deserved applause. My landing deserved counselling.",
  "The penalty box now needs a mop for all this drama.",
  "I have entered the concussion protocol for my ego.",
  "The football gods have subscribed to my pain channel.",
  "My boots are upside down and asking philosophical questions.",
  "The tackle had no chill and excellent comic timing.",
  "My dribble has been downgraded to a tumble subscription.",
  "The grass is celebrating like it scored the winner.",
  "Somebody notify my future highlight reel.",
  "My kneecaps are applying for annual leave.",
  "That was not a foul. That was a turf-based prank.",
  "The ball just whispered, 'new phone, who dis?'",
  "My World Cup dream has become a grass documentary.",
  "That flop had more layers than a lasagne formation.",
  "The ref has awarded a free kick to my feelings.",
  "My legs are now listed as day-to-day with silliness.",
  "The stadium screen asked if I was still watching.",
  "My training cone ancestors are embarrassed.",
  "That slide tackle violated the Geneva Convention of Vibes.",
  "My balance has been loaned to another club.",
  "The crowd has given the turf a standing ovation.",
  "The goal net is pretending to be busy.",
  "My boots and I need couples counselling.",
  "I have achieved full noodle-leg status.",
  "My expected goals are now expected groans.",
  "That tackle had a better plot twist than the final.",
  "The ball escaped the scene before police arrived.",
  "The sideline reporter is interviewing my left sock.",
  "My dignity is out for four to six weeks.",
  "The physio has recommended cartoons and orange slices.",
  "I am requesting a transfer to a softer pitch.",
  "My celebration plan has been replaced by floor time.",
  "The keeper's slide arrived with tracking information.",
  "The stadium has added a laugh track.",
  "My boots have declared it a public holiday.",
  "The grass stain is now my captain's armband.",
  "Pain-alty FC are scouting my commitment.",
  "The ball said I was too dramatic and moved clubs.",
  "The post-match interview will be conducted lying down.",
  "My hamstrings just voted to abandon the campaign.",
  "The keeper tackled me into a new browser tab.",
  "My touch was silk. My landing was wet cardboard.",
  "I came for glory and left with turf crumbs.",
  "The VAR room is just people laughing into clipboards.",
  "The floor has more possession than my team right now.",
  "That flop generated enough drama to power the stadium.",
  "The ref has checked the monitor and ordered popcorn.",
  "I am filing a complaint with the Department of Grass.",
  "The bootlaces need a motivational assembly.",
  "My run ended like a folding chair in a wind tunnel.",
  "The keeper slid through my hopes like a wet penguin.",
  "The replay operator needs extra fingers for rewind.",
  "My dignity just got nutmegged by oxygen.",
  "I require a yellow card for the concept of friction.",
  "The crowd has renamed this the Pain Cup.",
  "My body has switched to spectator mode.",
  "The grass has asked to keep the jersey.",
  "That was championship-level falling with group-stage defending.",
  "The penalty area has been declared a drama zone.",
  "My boot sponsor has blurred its logo.",
  "That tumble belongs in the Museum of Football Nonsense."
];

const PLAYER_FLOP_TEMPLATES = [
  "{kicker}'s dignity just got tackled into the souvenir shop.",
  "{kicker}'s boots have unfriended {goalie} immediately.",
  "{kicker} went for glory and found {goalie}'s sliding nonsense.",
  "{goalie} has turned {kicker}'s run-up into a roll-up.",
  "{kicker} is now sponsored by Pain-alty FC.",
  "{goalie} slid in like a lawnmower with football boots.",
  "{kicker}'s pride is being stretchered off by tiny mascots.",
  "{goalie} has been booked for crimes against balance.",
  "{kicker} has requested a softer planet for the next penalty.",
  "{goalie} just sent {kicker}'s xG into the compost bin.",
  "{kicker}'s shin pads are asking for a pay rise.",
  "{goalie} delivered the tackle with extra stadium crunch.",
  "{kicker}'s left boot is now somewhere near the hot chips.",
  "{goalie} slid so hard the turf asked for counselling.",
  "{kicker} is appealing to VAR, FIFA, and the tuckshop.",
  "{goalie} has turned {kicker} into a human tumbleweed.",
  "{kicker}'s penalty technique is now horizontal.",
  "{goalie} saw a dribble and chose cartoon violence.",
  "{kicker} has been promoted to Chief Floor Inspector.",
  "{goalie} has won the ball, the crowd, and {kicker}'s lunch money.",
  "{kicker}'s boots are in two different time zones.",
  "{goalie} is writing a PhD on dramatic grass contact.",
  "{kicker} just achieved maximum noodle-leg certification.",
  "{goalie}'s slide tackle needs its own theme music.",
  "{kicker}'s hopes have gone out for a throw-in.",
  "{goalie} has folded {kicker} like a tactics sheet.",
  "{kicker} is currently buffering on the penalty spot.",
  "{goalie} just converted a penalty into a grass nap.",
  "{kicker}'s dignity has been substituted for a packet of chips.",
  "{goalie} has given {kicker} a one-way ticket to Turf Town.",
  "{kicker}'s balance was last seen near the corner flag.",
  "{goalie} slid in with the emotional range of a bulldozer.",
  "{kicker} is not diving; {kicker} is auditioning for grass ballet.",
  "{goalie} has tackled {kicker}'s confidence clean out of the stadium.",
  "{kicker}'s dribble has become a tumble compilation.",
  "{goalie} should be charged with excessive silliness.",
  "{kicker}'s ankles have entered witness protection.",
  "{goalie} has unlocked the rare double-crunch achievement.",
  "{kicker} tried a stepover and discovered lay-down football.",
  "{goalie} just turned {kicker}'s dreams into lawn confetti.",
  "{kicker}'s penalty run has become a rolling documentary.",
  "{goalie} slid in like the final boss of playground football.",
  "{kicker} is requesting an orange slice and international justice.",
  "{goalie} has converted turf into a comedy weapon.",
  "{kicker}'s shooting foot has logged off for maintenance.",
  "{goalie} is celebrating like the grass scored the winner.",
  "{kicker}'s pride has been nutmegged by gravity.",
  "{goalie} applied maximum sauce to minimum contact.",
  "{kicker} is now a limited-edition grass stain.",
  "{goalie}'s tackle came with commentary, subtitles, and snacks.",
  "{kicker}'s legs have requested a tactical timeout.",
  "{goalie} just tackled the Wi-Fi out of {kicker}.",
  "{kicker}'s vibes are down and the ref says play on.",
  "{goalie} has been awarded three points for slapstick defending.",
  "{kicker} has entered the penalty box as furniture.",
  "{goalie} sent {kicker} spinning like a faulty corner flag.",
  "{kicker}'s run-up has been cancelled due to turf turbulence.",
  "{goalie} has achieved premium shenanigan status.",
  "{kicker}'s ego is rolling faster than the ball.",
  "{goalie} just made the grass shout 'again!'",
  "{kicker} is now a World Cup-inspired pancake.",
  "{goalie} has turned the penalty spot into a comedy club.",
  "{kicker}'s boots are asking to be traded to a walking sport.",
  "{goalie}'s slide tackle has qualified for the knockouts.",
  "{kicker} came in as a striker and left as a floor rug.",
  "{goalie} just won possession of {kicker}'s self-esteem.",
  "{kicker}'s knees have filed a formal complaint with FIFA.",
  "{goalie} slid so dramatically the crowd forgot the ball.",
  "{kicker} has been tackled into a new career as a speed bump.",
  "{goalie} just performed a legal mugging of momentum.",
  "{kicker}'s World Cup dream is now wearing grass earrings.",
  "{goalie}'s tackle had more crunch than a halftime sausage roll.",
  "{kicker} is in negotiations with the floor for extra time.",
  "{goalie} has sent {kicker}'s dignity to the bench.",
  "{kicker}'s first touch was art; the second was carpet.",
  "{goalie} has launched {kicker} into the Drama League.",
  "{kicker}'s hamstrings are asking if they can go home.",
  "{goalie} brought slide-tackle energy to a penalty appointment.",
  "{kicker} is now measuring the pitch with cheekbone confidence.",
  "{goalie} just turned the run-up into a lie-down.",
  "{kicker}'s boots are holding a crisis meeting in the tunnel.",
  "{goalie}'s tackle has been nominated for Best Flop Support.",
  "{kicker} just found every blade of grass personally.",
  "{goalie} has reduced {kicker}'s dribble to rubble.",
  "{kicker}'s pain is doing laps of the penalty area.",
  "{goalie} slid in like a fridge on roller skates.",
  "{kicker} has been grass-taxed by {goalie}.",
  "{goalie} just tackled {kicker}'s highlight reel into bloopers.",
  "{kicker}'s shooting boots are applying for sick leave.",
  "{goalie} has unlocked cinematic turf destruction.",
  "{kicker} is lying down to improve the camera angle.",
  "{goalie} has turned football into silly physics homework.",
  "{kicker}'s balance has left the group chat.",
  "{goalie} just gave {kicker} a guided tour of the grass.",
  "{kicker}'s soul is appealing from an offside position.",
  "{goalie} has smashed the drama button with both boots."
];

type MatchupRole = "kicker" | "goalie";

const MATCHUP_ROLE_TEMPLATES = [
  "{name} has brought pure {country} chaos to this pain-alty disaster.",
  "Number {number}, {name}, is currently sponsored by grass stains and regret.",
  "{name}'s {country} jersey now has a limited-edition turf pattern.",
  "{name} entered as the {role} and left as the official pitch inspector.",
  "{opponent} has accidentally turned {name} into a highlight reel pancake.",
  "{name} just gave {opponent} a masterclass in dramatic suffering.",
  "{name}'s number {number} shirt is doing most of the defending now.",
  "{name} is asking {opponent} for a written apology and a halftime snack.",
  "{opponent} has sent {name}'s balance to the transfer market.",
  "{name} is filing this under {country} football heritage and mild nonsense.",
  "{name} has discovered a new formation: one player, flat, near the spot.",
  "{opponent} has reduced {name}'s tactics to roll, complain, repeat.",
  "{name}'s boots just unfollowed {opponent} on every platform.",
  "{name} is requesting VAR from the Department of Very Dramatic Feelings.",
  "{opponent} has tackled {name}'s momentum into the school car park.",
  "{name}'s World Cup dream is now lying down for a tactical breather.",
  "{name} just turned the penalty box into a {country} soap opera.",
  "{opponent} has won possession of the ball and {name}'s emotional support shin pad.",
  "{name} has officially changed position to horizontal {role}.",
  "{name}'s number {number} is still spinning on the replay."
];

const CHARACTER_MATCHUP_TEMPLATES: Record<string, string[]> = {
  vinny_juicebox: [
    "Vinny Juicebox has been squeezed all over the penalty area.",
    "Someone put a straw in Vinny Juicebox, because that tackle drained him.",
    "Vinny Juicebox is leaking confidence and tropical football flavour.",
    "{opponent} just turned Vinny Juicebox into a carton of pure wobble."
  ],
  mmmbop_pe: [
    "MmmBop-pé hit the turf with a chorus of oof, bop, pain.",
    "That tackle remixed MmmBop-pé into MmmFlop-pé.",
    "MmmBop-pé just dropped the world's saddest penalty remix.",
    "The stadium is chanting: MmmBop, MmmDrop, MmmStop!"
  ],
  viking_corncob: [
    "The Viking Corncob has been buttered, battered, and rolled.",
    "Someone call Norway: The Viking Corncob has become stadium popcorn.",
    "The Viking Corncob went full longboat and crashed into the grass.",
    "That slide tackle turned The Viking Corncob into a husk of drama."
  ],
  dude_sellingham: [
    "Dude Selling-ham is trying to sell the ref a deluxe foul package.",
    "Dude Selling-ham has gone from box-to-box to floor-to-floor.",
    "That tackle put Dude Selling-ham on the clearance rack.",
    "Dude Selling-ham is demanding full retail price for that suffering."
  ],
  hairy_candycane: [
    "Hairy Candy-cane has been snapped like a festive formation.",
    "That tackle twisted Hairy Candy-cane into a Christmas corkscrew.",
    "Hairy Candy-cane is stuck to the turf with peppermint panic.",
    "{opponent} just unwrapped Hairy Candy-cane's balance."
  ],
  de_brainiac: [
    "Kevin De Brainiac calculated the angle and still chose the floor.",
    "Kevin De Brainiac's football brain has blue-screened on the grass.",
    "That tackle gave Kevin De Brainiac a PhD in tumbling.",
    "Kevin De Brainiac is solving for xG: expected grass."
  ],
  mo_saladbowl: [
    "Mo Salad-bowl has been tossed across the penalty area.",
    "That slide tackle added extra croutons to Mo Salad-bowl's suffering.",
    "Mo Salad-bowl is now a mixed leaf formation on the turf.",
    "{opponent} just dressed Mo Salad-bowl with pure chaos vinaigrette."
  ],
  rodri_gocart: [
    "Rodri-go-cart has lost a wheel near the penalty spot.",
    "That tackle sent Rodri-go-cart straight into the tyre wall of turf.",
    "Rodri-go-cart is requesting a pit stop and emotional fuel.",
    "{opponent} just blue-shelled Rodri-go-cart's penalty run."
  ],
  antfarm_greaseman: [
    "Ant-farm Grease-man has slipped through three dimensions of nonsense.",
    "That tackle turned Ant-farm Grease-man into a very worried picnic.",
    "Ant-farm Grease-man is crawling back to the penalty spot with style.",
    "{opponent} just sprayed Ant-farm Grease-man across the grass like cooking oil."
  ],
  lambchop_yampot: [
    "Lamb Chop Yam-pot has been mashed by the penalty box.",
    "That tackle turned Lamb Chop Yam-pot into Sunday roast football.",
    "Lamb Chop Yam-pot is simmering in tactical outrage.",
    "{opponent} just served Lamb Chop Yam-pot with extra grass gravy."
  ],
  bookayo: [
    "Boo-Kayo Soccer-ball has been spooked into a full tumble.",
    "That tackle gave Boo-Kayo Soccer-ball a scary bedtime story.",
    "Boo-Kayo Soccer-ball is now haunting the penalty spot horizontally.",
    "{opponent} just yelled boo and Boo-Kayo became floor décor."
  ],
  crispy_penaldo: [
    "Crispy Penaldo has been extra-crunched in the pain-alty fryer.",
    "That tackle turned Crispy Penaldo into a golden-brown flop nugget.",
    "Crispy Penaldo is appealing for a free kick and dipping sauce.",
    "{opponent} just cooked Crispy Penaldo at 200 degrees of drama."
  ],
  lawan_doughnut: [
    "Robert Lawan-doughnut has rolled into a perfect glazed circle.",
    "That tackle put a hole in Robert Lawan-doughnut's penalty plan.",
    "Robert Lawan-doughnut is requesting sprinkles and justice.",
    "{opponent} just dunked Robert Lawan-doughnut in turf-flavoured chaos."
  ],
  smart_inez: [
    "Low-Tarot Smart-inez predicted pain and still picked that card.",
    "Low-Tarot Smart-inez has drawn the upside-down grass card.",
    "That tackle gave Low-Tarot Smart-inez a future full of turf crumbs.",
    "{opponent} just read Low-Tarot Smart-inez's fortune: flop incoming."
  ],
  barnyard_silver: [
    "Barnyard Silver has gone full farmyard tumble in the box.",
    "That tackle milked every ounce of drama from Barnyard Silver.",
    "Barnyard Silver is neigh-bouring dangerously close to the floor.",
    "{opponent} just turned Barnyard Silver into penalty-area hay."
  ],
  lionel_pessi: [
    "Lionel Pessi has turned pressure into pure pain-alty theatre.",
    "That tackle made Lionel Pessi look like the GOAT of rolling around.",
    "Lionel Pessi is asking for a penalty, a trophy, and a blanket.",
    "{opponent} just made Lionel Pessi dribble into another postcode."
  ],
  floorcleaner_hurts: [
    "Floor-cleaner Hurts is finally living up to the name.",
    "Floor-cleaner Hurts has polished the penalty spot with his feelings.",
    "That tackle made Floor-cleaner Hurts clean the grass with maximum sadness.",
    "{opponent} just ordered Floor-cleaner Hurts to mop up his own dignity."
  ],
  jamal_mooseala: [
    "Jamal Moose-ala has been antlered into a tactical tumble.",
    "That tackle sent Jamal Moose-ala migrating across the grass.",
    "Jamal Moose-ala is hoofing around for his missing balance.",
    "{opponent} just turned Jamal Moose-ala into a penalty-area wildlife documentary."
  ],
  declan_friedrice: [
    "Declan Fried-Rice has been tossed in the wok of chaos.",
    "That tackle made Declan Fried-Rice extra crispy on the grass.",
    "Declan Fried-Rice is steaming with tactical confusion.",
    "{opponent} just served Declan Fried-Rice with a side of oof."
  ],
  fedora_vaultverde: [
    "Fedora Vault-verde tipped his hat and fell into next week.",
    "That tackle sent Fedora Vault-verde into a vault of embarrassment.",
    "Fedora Vault-verde has locked his balance in a safe and lost the key.",
    "{opponent} just snatched Fedora Vault-verde's hat and dignity."
  ],
  blunder_hairnandes: [
    "Blunder Hair-nandes has turned the run-up into a hair-raising disaster.",
    "That tackle gave Blunder Hair-nandes a fresh trim of suffering.",
    "Blunder Hair-nandes is blaming the fringe, the grass, and VAR.",
    "{opponent} just combed Blunder Hair-nandes straight into the turf."
  ],
  achef_bigmeanie: [
    "A-Chef Big-Meanie has been served a five-star grass sandwich.",
    "That tackle cooked A-Chef Big-Meanie's penalty plans to charcoal.",
    "A-Chef Big-Meanie is demanding the recipe for that disaster.",
    "{opponent} just plated A-Chef Big-Meanie with a garnish of pain."
  ],
  allinson_baker: [
    "All-in-son Baker has been baked into the penalty area.",
    "That tackle left All-in-son Baker flatter than a tactical pancake.",
    "All-in-son Baker is proofing on the turf until further notice.",
    "{opponent} just put All-in-son Baker in the flop oven."
  ],
  hungryman_son: [
    "Hungry-man Son has eaten a full serving of turf.",
    "That tackle gave Hungry-man Son the grass buffet special.",
    "Hungry-man Son is still hungry, but mostly for justice.",
    "{opponent} just served Hungry-man Son a combo meal of oof."
  ],
  lukewarm_modrich: [
    "Lukewarm Mod-rich has gone from midfield maestro to mild-temperature carpet.",
    "That tackle cooled Lukewarm Mod-rich's run-up instantly.",
    "Lukewarm Mod-rich is stirring the grass like a tiny Croatian soup.",
    "{opponent} just reheated Lukewarm Mod-rich's suffering."
  ],
  older_guard: [
    "Martian Older-guard has orbited straight into the grass.",
    "That tackle sent Martian Older-guard back to the football moon.",
    "Martian Older-guard is guarding the floor with ancient commitment.",
    "{opponent} just launched Martian Older-guard into tactical space."
  ],
  endzone_furnandes: [
    "Endzone Fur-nandes has reached the endzone of embarrassment.",
    "That tackle turned Endzone Fur-nandes into a touchdown of turf.",
    "Endzone Fur-nandes is celebrating zero yards gained and maximum drama.",
    "{opponent} just punted Endzone Fur-nandes' balance into Row Z."
  ],
  kneehigh_williams: [
    "Knee-high Will-i-ams has taken the name far too literally.",
    "That tackle left Knee-high Will-i-ams knee-high in nonsense.",
    "Knee-high Will-i-ams is asking his socks for leadership.",
    "{opponent} just sent Knee-high Will-i-ams into shin-pad diplomacy."
  ],
  keyboard_spaghetti: [
    "Keyboard Kvarat-spaghetti has mashed every key at once: O-O-F.",
    "That tackle turned Keyboard Kvarat-spaghetti into penalty pasta.",
    "Keyboard Kvarat-spaghetti is tangled in the grass shortcut keys.",
    "{opponent} just ctrl-alt-deleted Keyboard Kvarat-spaghetti's balance."
  ],
  raffy_lizardo: [
    "Raffy Lizard-o has shed his dignity and scampered into the turf.",
    "That tackle made Raffy Lizard-o stick to the grass wall.",
    "Raffy Lizard-o is sunbaking on the penalty spot against his will.",
    "{opponent} just turned Raffy Lizard-o into a reptile replay."
  ],
  william_saliva: [
    "William Saliva has drooled his way into the flop files.",
    "That tackle left William Saliva absolutely gobsmacked on the grass.",
    "William Saliva is spitting chips and requesting VAR.",
    "{opponent} just made William Saliva lose all mouth-control tactics."
  ],
  micdrop_mayo: [
    "Mic-drop Mayonnaise has slipped right off the sandwich of destiny.",
    "That tackle made Mic-drop Mayonnaise drop the mic and the penalty run.",
    "Mic-drop Mayonnaise is spread across the turf with confidence.",
    "{opponent} just added extra mayo to the grass sandwich."
  ]
};

const FLOP_BUBBLE_SWITCH_MS = 3250;

function stableHash(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function playerCharacter(player: PlayerRecord | null): Character | null {
  if (!player) return null;
  return CHARACTERS[player.characterIndex] ?? null;
}

function sillyCharacterName(player: PlayerRecord | null, fallback: string): string {
  return playerCharacter(player)?.name ?? player?.name ?? fallback;
}

function tokeniseFlopTemplate(template: string, kicker: string, goalie: string): string {
  return template
    .replace(/\{kicker\}/g, kicker)
    .replace(/\{goalie\}/g, goalie);
}

function tokeniseMatchupTemplate(
  template: string,
  character: Character,
  opponentName: string,
  role: MatchupRole
): string {
  return template
    .replace(/\{name\}/g, character.name)
    .replace(/\{opponent\}/g, opponentName)
    .replace(/\{role\}/g, role)
    .replace(/\{otherRole\}/g, role === "kicker" ? "goalie" : "striker")
    .replace(/\{country\}/g, character.country)
    .replace(/\{number\}/g, String(character.number));
}

function buildCharacterMatchupLines(
  player: PlayerRecord | null,
  opponentName: string,
  role: MatchupRole
): string[] {
  const character = playerCharacter(player);
  if (!character) return [];
  const sharedRoleLines = MATCHUP_ROLE_TEMPLATES.map((line) =>
    tokeniseMatchupTemplate(line, character, opponentName, role)
  );
  const characterLines = (CHARACTER_MATCHUP_TEMPLATES[character.id] ?? []).map((line) =>
    tokeniseMatchupTemplate(line, character, opponentName, role)
  );
  return [...sharedRoleLines, ...characterLines];
}

function buildFlopLineBank(kicker: PlayerRecord | null, goalie: PlayerRecord | null): string[] {
  const kickerName = sillyCharacterName(kicker, "The striker");
  const goalieName = sillyCharacterName(goalie, "The goalie");

  const playerLines = PLAYER_FLOP_TEMPLATES.map((line) => tokeniseFlopTemplate(line, kickerName, goalieName));
  const kickerSpecificLines = buildCharacterMatchupLines(kicker, goalieName, "kicker");
  const goalieSpecificLines = buildCharacterMatchupLines(goalie, kickerName, "goalie");

  // Only use the actual players in this tackle for name-specific jokes.
  // This avoids random roster cameos and keeps every pun relevant to the current matchup.
  return Array.from(new Set([...BASE_FLOP_LINES, ...playerLines, ...kickerSpecificLines, ...goalieSpecificLines]));
}

function pickIndexedLine(lines: string[], seed: number, usedLines: Set<string>, exclude?: string): string {
  const unused = lines.filter((line) => line !== exclude && !usedLines.has(line));
  const pool = unused.length ? unused : lines.filter((line) => line !== exclude);
  if (!pool.length) return lines[0] ?? "The flop has entered football folklore.";
  return pool[seed % pool.length];
}

export class TackleScene extends Phaser.Scene {
  private unsub?: () => void;
  private currentState: PublicState | null = null;
  private keys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<string, Phaser.Input.Keyboard.Key> = {};
  private lastMove = 0;
  private touchDx = 0;
  private touchDy = 0;
  private activeTouchDirections = new Map<number, { dx: number; dy: number }>();
  private controlsCreated = false;
  private flopSelections = new Map<string, [string, string]>();
  private usedFlopLines = new Set<string>();
  private activeFlopGameKey = "";
  private soundPlayedForTackleImpactKey: string | null = null;

  constructor() {
    super("TackleScene");
  }

  preload() {
    preloadAudio(this);
  }

  create() {
    playMusic(this, "penalty");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsub?.());
    this.keys = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.releaseTouchDirection(pointer.id));
    this.input.on("gameout", () => this.clearTouchDirections());
    this.unsub = Net.onState((state) => {
      if (!this.scene.isActive("TackleScene")) return;
      routeScene(this, state);
      if (this.scene.isActive("TackleScene")) {
        this.currentState = state;
        this.render(state);
      }
    });
  }

  update(time: number) {
    const s = this.currentState;
    if (!s?.tackle || s.tackle.impactAt) return;
    const canMove = s.tackle.kickerId === Net.sessionId || s.tackle.goalieId === Net.sessionId;
    if (!canMove || s.isSpectating) return;
    if (time - this.lastMove < 55) return;
    let dx = this.touchDx;
    let dy = this.touchDy;
    if (this.keys?.left.isDown || this.wasd.A?.isDown) dx -= 1;
    if (this.keys?.right.isDown || this.wasd.D?.isDown) dx += 1;
    if (this.keys?.up.isDown || this.wasd.W?.isDown) dy -= 1;
    if (this.keys?.down.isDown || this.wasd.S?.isDown) dy += 1;
    dx = Phaser.Math.Clamp(dx, -1, 1);
    dy = Phaser.Math.Clamp(dy, -1, 1);
    if (dx || dy) {
      Net.send("move", { dx, dy });
      this.lastMove = time;
    }
  }

  shutdown() {
    this.clearTouchDirections();
    this.controlsCreated = false;
    this.unsub?.();
    this.soundPlayedForTackleImpactKey = null;
    stopSfxChannel("commentary");
    stopSfxChannel("crowd");
    stopSfxChannel("misc");
  }

  private playTackleCommentaryOnce(tackle: NonNullable<PublicState["tackle"]>) {
    const key = `${tackle.kickerId}|${tackle.goalieId}|${tackle.startedAt}|${tackle.impactAt ?? 0}`;
    if (this.soundPlayedForTackleImpactKey === key) return;
    this.soundPlayedForTackleImpactKey = key;

    // Hotfix 61 sequence: whistle and random crowd reaction together at
    // impact, followed by the random tackle commentary after the whistle.
    void playTackleImpactSequence();
  }

  private render(state: PublicState) {
    this.resetFlopMemoryIfNewGame(state);
    [...this.children.list].forEach((child) => {
      if (!child.getData?.("persistentControl")) child.destroy();
    });
    drawPitch(this);
    const t = state.tackle;
    addTopBar(this, state, state.isSpectating ? `LIVE SPECTATOR • ${state.message}` : state.message);
    if (state.isSpectating) {
      addButton(this, 112, 103, 190, 44, "← BRACKET", () => Net.send("stopWatching"), 0x115b96);
      this.add.text(W - 120, 102, "LIVE SPECTATOR", { fontFamily: "Arial", fontSize: "18px", fontStyle: "900", color: "#7dff9b", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5);
    }
    if (!t) return;

    const kicker = getPlayer(state, t.kickerId);
    const goalie = getPlayer(state, t.goalieId);
    const activeMatch = state.bracket.find((m) => m.id === state.activeMatchId);
    const isKicker = Net.sessionId === t.kickerId;
    const isGoalie = Net.sessionId === t.goalieId;
    const impactAt = t.impactAt ?? null;
    const impactElapsed = impactAt ? Date.now() - impactAt : 0;

    this.drawSceneHeader(state, activeMatch?.p1Score ?? 0, activeMatch?.p2Score ?? 0);

    if (impactAt) {
      this.playTackleCommentaryOnce(t);
      this.drawImpactAnimation(t.kickerX, t.kickerY, t.goalieX, t.goalieY, kicker, goalie, impactElapsed, t);
    } else {
      this.drawChaseAnimation(t.kickerX, t.kickerY, t.goalieX, t.goalieY, kicker, goalie, t.tackleStyle);
      drawArcadeBall(this, t.kickerX + 38, t.kickerY + 35, 14, 18).setRotation(this.time.now / 260);
    }

    const remaining = Math.max(0, Math.ceil((t.timeoutAt - Date.now()) / 1000));
    const instruction = impactAt
      ? "Penalty incoming after the theatrical rolling stops..."
      : isKicker
        ? "You are dribbling. Dodge around for fun — the goalie is hunting for drama!"
        : isGoalie
          ? "You are the defender. Chase them down — you move faster and the tackle lands within 5 seconds!"
          : "Spectator mode: watch the pre-penalty nonsense unfold.";

    this.add.text(W / 2, H - 74, instruction, {
      fontFamily: "Arial",
      fontSize: "22px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5,
      align: "center",
      wordWrap: { width: 950 }
    }).setOrigin(0.5);

    this.add.text(W - 76, H - 76, `${remaining}s`, {
      fontFamily: "Arial",
      fontSize: "34px",
      fontStyle: "900",
      color: impactAt ? "#ffdf5c" : "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0.5);

    if ((isKicker || isGoalie) && !impactAt && !state.isSpectating) this.addDpad(isGoalie ? "CHASE" : "DODGE");
  }

  private drawSceneHeader(state: PublicState, p1Score: number, p2Score: number) {
    const t = state.tackle;
    if (!t) return;

    this.add.text(W / 2, 102, `${playerLabel(state, t.kickerId)}  vs  ${playerLabel(state, t.goalieId)}`, {
      fontFamily: "Arial",
      fontSize: "28px",
      fontStyle: "900",
      color: "#fff2a6",
      stroke: "#000000",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5);

    this.add.text(W / 2, 140, t.impactAt ? "THE FLOP OF THE CENTURY" : `Pre-penalty drama: ${t.tackleText}`, {
      fontFamily: "Arial",
      fontSize: "22px",
      fontStyle: "900",
      color: t.impactAt ? "#ffdf5c" : "#ffffff",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.rectangle(W / 2, 192, 260, 72, 0x07170c, 0.80).setStrokeStyle(3, 0xffffff, 0.5);
    this.add.text(W / 2, 183, "MATCH SCORE", {
      fontFamily: "Arial",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.add.text(W / 2, 213, `${p1Score}-${p2Score}`, {
      fontFamily: "Arial",
      fontSize: "38px",
      fontStyle: "900",
      color: "#fff2a6"
    }).setOrigin(0.5);
  }

  private drawChaseAnimation(kx: number, ky: number, gx: number, gy: number, kicker: PlayerRecord | null, goalie: PlayerRecord | null, style: "slide" | "flyingKick" | "spinKick") {
    const dx = kx - gx;
    const dy = ky - gy;
    const dist = Math.hypot(dx, dy);
    const close = dist < 210;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.24);
    shadow.fillEllipse(kx, ky + 72, 74, 16);
    shadow.fillEllipse(gx, gy + 78, close ? 108 : 82, 18);

    const kickerSprite = drawFootballer(this, kx, ky, kicker, 0.82, true);
    const goalieSprite = drawFootballer(this, gx, gy, goalie, 0.94, true);

    if (close) {
      if (style === "flyingKick") {
        goalieSprite.setRotation(-1.38);
        goalieSprite.setScale(1.16, 0.84);
        goalieSprite.y -= 28;
        this.drawSlideTrail(gx + 8, gy + 28, 0x11b9e8, "FLYING KICK!");
      } else if (style === "spinKick") {
        goalieSprite.setRotation(this.time.now / 150);
        goalieSprite.setScale(1.08, 0.92);
        this.drawSlideTrail(gx + 12, gy + 48, 0xe33b32, "SPIN KICK!");
      } else {
        goalieSprite.setRotation(-0.72);
        goalieSprite.setScale(1.04, 0.92);
        this.drawSlideTrail(gx + 12, gy + 50, 0xffdf5c, "SLIDE TACKLE!");
      }
      this.drawWarningBurst((kx + gx) / 2, (ky + gy) / 2 - 35);
    } else {
      this.drawMotionLines(gx - 56, gy + 28);
    }
  }

  private drawImpactAnimation(
    kx: number,
    ky: number,
    gx: number,
    gy: number,
    kicker: PlayerRecord | null,
    goalie: PlayerRecord | null,
    elapsed: number,
    tackle: NonNullable<PublicState["tackle"]>
  ) {
    const phase = Math.min(1, elapsed / 6500);
    const rollAngle = elapsed / 120;
    const bounce = Math.abs(Math.sin(elapsed / 210)) * 34 * (1 - phase * 0.35);
    const rollRadius = 72 * (1 - phase * 0.18);
    const rollX = kx - 28 + Math.sin(elapsed / 235) * rollRadius;
    const rollY = ky + 28 + Math.sin(elapsed / 310) * 34;

    this.drawExplosion(kx + 18, ky + 38, elapsed);
    this.drawRollTrack(rollX, rollY, elapsed);
    const style = tackle.tackleStyle ?? "slide";
    this.drawSlideTrail(gx, gy + 46, style === "flyingKick" ? 0x11b9e8 : style === "spinKick" ? 0xe33b32 : 0xffaa00, style === "flyingKick" ? "KAPOW!" : style === "spinKick" ? "WHIRL!" : "CRUNCH!");
    const goalieSprite = drawFootballer(this, gx + 18, gy + 24, goalie, 0.92, true);
    if (style === "flyingKick") {
      goalieSprite.setRotation(-1.55);
      goalieSprite.setScale(1.18, 0.78);
      goalieSprite.y -= 34;
    } else if (style === "spinKick") {
      goalieSprite.setRotation(elapsed / 130);
      goalieSprite.setScale(1.08, 0.90);
    } else {
      goalieSprite.setRotation(-1.18);
      goalieSprite.setScale(1.08, 0.82);
    }

    this.drawFloppingFootballer(rollX, rollY - bounce, kicker, rollAngle, phase, elapsed);
    this.drawLooseBall(rollX + 54 + Math.sin(elapsed / 170) * 18, rollY + 10 - bounce * 0.45, elapsed);
    this.drawPainStars(rollX, rollY - 82 - bounce * 0.35, elapsed);

    // Draw commentary last so it sits above the animation.
    // Exactly two lines are used for each tackle, pulled from a large pool.
    // The scene remembers used lines during a bracket so jokes do not repeat until the pool is exhausted.
    // Keep the speech card on the opposite side of the pitch from the rolling/flopping action
    // so it does not cover the slapstick animation.
    const flopLines = this.getFlopLinesForTackle(tackle, kicker, goalie);
    const bubbleText = elapsed < FLOP_BUBBLE_SWITCH_MS ? flopLines[0] : flopLines[1];
    const bubbleX = rollX < W / 2 ? W - 360 : 360;
    const bubbleY = Math.max(318, Math.min(H - 190, rollY + 18));
    this.drawSpeechBubble(bubbleX, bubbleY, bubbleText);
  }


  private resetFlopMemoryIfNewGame(state: PublicState) {
    const bracketKey = state.bracket.map((match) => `${match.id}:${match.p1}:${match.p2}`).join("|");
    const gameKey = `${state.roomCode}|${state.tournamentSize}|${bracketKey}`;
    if (gameKey && gameKey !== this.activeFlopGameKey) {
      this.activeFlopGameKey = gameKey;
      this.flopSelections.clear();
      this.usedFlopLines.clear();
    }
  }

  private getFlopLinesForTackle(
    tackle: NonNullable<PublicState["tackle"]>,
    kicker: PlayerRecord | null,
    goalie: PlayerRecord | null
  ): [string, string] {
    const tackleKey = `${this.activeFlopGameKey}|${tackle.kickerId}|${tackle.goalieId}|${tackle.tackleText}|${tackle.startedAt}|${tackle.impactAt ?? 0}`;
    const cached = this.flopSelections.get(tackleKey);
    if (cached) return cached;

    const lineBank = buildFlopLineBank(kicker, goalie);
    const seed = stableHash(tackleKey);
    const first = pickIndexedLine(lineBank, seed, this.usedFlopLines);
    this.usedFlopLines.add(first);

    const secondSeed = stableHash(`${tackleKey}|second|${first}|${this.usedFlopLines.size}`);
    const second = pickIndexedLine(lineBank, secondSeed, this.usedFlopLines, first);
    this.usedFlopLines.add(second);

    const selection: [string, string] = [first, second];
    this.flopSelections.set(tackleKey, selection);
    return selection;
  }

  private drawFloppingFootballer(x: number, y: number, player: PlayerRecord | null, rollAngle: number, phase: number, elapsed: number) {
    const container = drawFootballer(this, x, y, player, 0.82, false);
    const flopVariant = Math.abs(Math.floor((x + y) / 37)) % 3;
    if (flopVariant === 0) {
      container.setRotation(rollAngle);
      container.setScale(1.02 + Math.sin(elapsed / 150) * 0.10, 0.82 + Math.cos(elapsed / 180) * 0.12);
    } else if (flopVariant === 1) {
      container.setRotation(-rollAngle * 0.72);
      container.setScale(0.88 + Math.sin(elapsed / 125) * 0.13, 1.04 + Math.cos(elapsed / 160) * 0.10);
      container.y -= Math.abs(Math.sin(elapsed / 180)) * 22;
    } else {
      container.setRotation(Math.sin(elapsed / 180) * 1.25);
      container.setScale(1.10, 0.76 + Math.abs(Math.cos(elapsed / 150)) * 0.20);
      container.x += Math.sin(elapsed / 105) * 18;
    }

    // A clearer "rolling around" outline so the simple procedural player reads as tumbling.
    const g = this.add.graphics();
    g.lineStyle(5, 0xffdf5c, 0.42);
    g.strokeEllipse(x, y + 10, 118 * (1 - phase * 0.25), 66 * (1 - phase * 0.10));
    g.lineStyle(3, 0xffffff, 0.35);
    g.strokeEllipse(x + Math.sin(elapsed / 220) * 12, y + 8, 84, 46);
  }

  private drawRollTrack(x: number, y: number, elapsed: number) {
    const g = this.add.graphics();
    g.lineStyle(4, 0xffffff, 0.22);
    for (let i = 0; i < 5; i++) {
      const offset = i * 18;
      g.strokeEllipse(x - 70 + offset, y + 38 + Math.sin(elapsed / 200 + i) * 8, 52, 18);
    }
    g.fillStyle(0xffdf5c, 0.30);
    for (let i = 0; i < 10; i++) {
      g.fillCircle(x - 90 + i * 20, y + 48 + Math.sin(elapsed / 160 + i) * 10, 3 + (i % 3));
    }
  }

  private drawLooseBall(x: number, y: number, elapsed: number) {
    drawArcadeBall(this, x, y, 14, 24).setRotation(elapsed / 120);
  }

  private drawSlideTrail(x: number, y: number, color: number, label: string) {
    const g = this.add.graphics();
    for (let i = 0; i < 5; i++) {
      g.lineStyle(4, color, 0.18 + i * 0.07);
      g.lineBetween(x - 130 - i * 9, y + i * 5, x - 20 - i * 5, y - 4 + i * 2);
    }
    g.fillStyle(0xffffff, 0.34);
    for (let i = 0; i < 8; i++) {
      g.fillCircle(x - 105 + i * 16, y + 18 + Math.sin(i) * 8, 3 + (i % 3));
    }
    this.add.text(x - 112, y - 38, label, {
      fontFamily: "Arial",
      fontSize: "20px",
      fontStyle: "900",
      color: "#ffdf5c",
      stroke: "#000000",
      strokeThickness: 4
    }).setRotation(-0.18);
  }

  private drawMotionLines(x: number, y: number) {
    const g = this.add.graphics();
    g.lineStyle(4, 0xffffff, 0.28);
    for (let i = 0; i < 5; i++) {
      g.lineBetween(x - i * 12, y + i * 11, x + 55 - i * 10, y + i * 9);
    }
  }

  private drawWarningBurst(x: number, y: number) {
    this.add.text(x, y, "!", {
      fontFamily: "Arial",
      fontSize: "46px",
      fontStyle: "900",
      color: "#ffdf5c",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);
  }

  private drawExplosion(x: number, y: number, elapsed: number) {
    const g = this.add.graphics();
    const pulse = 1 + Math.sin(elapsed / 130) * 0.14;
    g.fillStyle(0xffdf5c, 0.32);
    g.fillCircle(x, y, 44 * pulse);
    g.lineStyle(5, 0xffdf5c, 0.72);
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + elapsed / 500;
      g.lineBetween(x + Math.cos(a) * 28, y + Math.sin(a) * 28, x + Math.cos(a) * 62, y + Math.sin(a) * 62);
    }
  }

  private drawPainStars(x: number, y: number, elapsed: number) {
    const symbols = ["★", "✦", "✧", "💫"];
    for (let i = 0; i < 5; i++) {
      const a = elapsed / 360 + i * 1.25;
      const sx = x + Math.cos(a) * (48 + i * 5);
      const sy = y + Math.sin(a) * (20 + i * 4);
      this.add.text(sx, sy, symbols[i % symbols.length], {
        fontFamily: "Arial",
        fontSize: `${18 + (i % 2) * 6}px`,
        fontStyle: "900",
        color: i % 2 ? "#ffdf5c" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 3
      }).setOrigin(0.5);
    }
  }

  private drawSpeechBubble(x: number, y: number, text: string) {
    const w = 560;
    const h = 96;
    this.add.rectangle(x, y, w, h, 0xffffff, 0.96)
      .setOrigin(0.5)
      .setStrokeStyle(5, 0x000000, 0.86);

    this.add.text(x, y - 31, "FLOP COMMENTARY", {
      fontFamily: "Arial",
      fontSize: "15px",
      fontStyle: "900",
      color: "#0b5d33",
      align: "center"
    }).setOrigin(0.5);

    this.add.text(x, y + 12, text, {
      fontFamily: "Arial",
      fontSize: "19px",
      fontStyle: "900",
      color: "#102016",
      align: "center",
      wordWrap: { width: w - 40 }
    }).setOrigin(0.5);
  }

  private addDpad(roleLabel: "DODGE" | "CHASE") {
    if (this.controlsCreated) return;
    this.controlsCreated = true;
    const x = 132;
    const y = 574;
    const role = this.add.text(x, y - 105, roleLabel, {
      fontFamily: "Arial", fontSize: "18px", fontStyle: "900", color: "#fff2a6",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000).setData("persistentControl", true);
    role.setScrollFactor(0);
    this.addHoldButton(x, y - 62, 74, 60, "▲", 0, -1);
    this.addHoldButton(x, y + 62, 74, 60, "▼", 0, 1);
    this.addHoldButton(x - 78, y, 74, 60, "◀", -1, 0);
    this.addHoldButton(x + 78, y, 74, 60, "▶", 1, 0);
  }

  private recomputeTouchVector() {
    let dx = 0;
    let dy = 0;
    for (const direction of this.activeTouchDirections.values()) {
      dx += direction.dx;
      dy += direction.dy;
    }
    this.touchDx = Phaser.Math.Clamp(dx, -1, 1);
    this.touchDy = Phaser.Math.Clamp(dy, -1, 1);
  }

  private releaseTouchDirection(pointerId: number) {
    this.activeTouchDirections.delete(pointerId);
    this.recomputeTouchVector();
  }

  private clearTouchDirections() {
    this.activeTouchDirections.clear();
    this.touchDx = 0;
    this.touchDy = 0;
  }

  private addHoldButton(x: number, y: number, w: number, h: number, label: string, dx: number, dy: number) {
    const bg = this.add.rectangle(x, y, w, h, 0x143d2a, 0.96)
      .setStrokeStyle(3, 0xffffff, 0.78)
      .setInteractive({ useHandCursor: true })
      .setDepth(1000)
      .setData("persistentControl", true);
    const text = this.add.text(x, y, label, {
      fontFamily: "Arial", fontSize: "30px", fontStyle: "900", color: "#ffffff",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(1001).setData("persistentControl", true);
    text.setScrollFactor(0);
    bg.setScrollFactor(0);

    const press = (pointer: Phaser.Input.Pointer) => {
      pointer.event?.preventDefault?.();
      this.activeTouchDirections.set(pointer.id, { dx, dy });
      this.recomputeTouchVector();
      bg.setFillStyle(0x1f8f55, 1).setScale(0.94);
      Net.send("move", { dx: this.touchDx, dy: this.touchDy });
    };
    const release = (pointer: Phaser.Input.Pointer) => {
      this.releaseTouchDirection(pointer.id);
      bg.setFillStyle(0x143d2a, 0.96).setScale(1);
    };
    bg.on("pointerdown", press);
    bg.on("pointerup", release);
    bg.on("pointerupoutside", release);
  }
}
