export type EPGItem = {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationMinutes: number;
};

export type Channel = {
  id: string;
  number: number;
  name: string;
  url: string;
  group: string;
  country?: string;
  quality?: string;
  logo?: string;
  host: string;
  epg: EPGItem[];
  working?: boolean;
  latency?: number;
};

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "LIVE" | "UPCOMING" | "FINISHED";
  time: string;
  tournament: string;
  possession: [number, number];
  shots: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  lineups: {
    home: string[];
    away: string[];
  };
};

export type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  readTime: string;
  author: string;
};

export function getLiveMatches(): Match[] {
  return [
    {
      id: "match-1",
      homeTeam: "Argentina",
      awayTeam: "France",
      homeScore: 3,
      awayScore: 2,
      status: "LIVE",
      time: "84'",
      tournament: "FIFA World Cup - Semi Finals",
      possession: [56, 44],
      shots: [14, 9],
      yellowCards: [2, 3],
      redCards: [0, 0],
      lineups: {
        home: ["Martinez", "Molina", "Romero", "Otamendi", "Tagliafico", "De Paul", "Fernandez", "Mac Allister", "Messi", "Alvarez", "Gonzalez"],
        away: ["Maignan", "Kounde", "Upamecano", "Saliba", "Hernandez", "Tchouameni", "Rabiot", "Dembele", "Griezmann", "Mbappe", "Giroud"]
      }
    },
    {
      id: "match-2",
      homeTeam: "Brazil",
      awayTeam: "Germany",
      homeScore: 1,
      awayScore: 1,
      status: "LIVE",
      time: "41'",
      tournament: "FIFA World Cup - Group A",
      possession: [62, 38],
      shots: [11, 4],
      yellowCards: [1, 2],
      redCards: [0, 0],
      lineups: {
        home: ["Ederson", "Danilo", "Marquinhos", "Gabriel", "Arana", "Guimaraes", "Gomes", "Paqueta", "Rodrygo", "Vinicius Jr", "Raphinha"],
        away: ["Neuer", "Kimmich", "Tah", "Rudiger", "Mittelstadt", "Andrich", "Kroos", "Musiala", "Gundogan", "Wirtz", "Havertz"]
      }
    },
    {
      id: "match-3",
      homeTeam: "Spain",
      awayTeam: "England",
      homeScore: 2,
      awayScore: 0,
      status: "FINISHED",
      time: "FT",
      tournament: "FIFA World Cup - Final",
      possession: [58, 42],
      shots: [17, 8],
      yellowCards: [1, 1],
      redCards: [0, 0],
      lineups: {
        home: ["Raya", "Carvajal", "Le Normand", "Laporte", "Cucurella", "Rodri", "Ruiz", "Yamal", "Olmo", "Williams", "Morata"],
        away: ["Pickford", "Walker", "Stones", "Guehi", "Trippier", "Mainoo", "Rice", "Saka", "Bellingham", "Foden", "Kane"]
      }
    },
    {
      id: "match-4",
      homeTeam: "Colombia",
      awayTeam: "Uruguay",
      homeScore: 0,
      awayScore: 0,
      status: "UPCOMING",
      time: "20:00",
      tournament: "FIFA World Cup - Round of 16",
      possession: [50, 50],
      shots: [0, 0],
      yellowCards: [0, 0],
      redCards: [0, 0],
      lineups: {
        home: ["Vargas", "Munoz", "Sanchez", "Cuesta", "Mojica", "Rios", "Lerma", "Arias", "James Rodriguez", "Diaz", "Cordoba"],
        away: ["Rochet", "Nandez", "Gimenez", "Olivera", "Vina", "Valverde", "Ugarte", "Pellistri", "De Arrascaeta", "Araujo", "Nunez"]
      }
    },
    {
      id: "match-5",
      homeTeam: "Portugal",
      awayTeam: "Morocco",
      homeScore: 1,
      awayScore: 0,
      status: "FINISHED",
      time: "FT",
      tournament: "FIFA World Cup - Quarter Finals",
      possession: [52, 48],
      shots: [12, 14],
      yellowCards: [3, 2],
      redCards: [0, 0],
      lineups: {
        home: ["Costa", "Cancelo", "Dias", "Inacio", "Mendes", "Fernandes", "Palhinha", "Vitinha", "Silva", "Ronaldo", "Leao"],
        away: ["Bounou", "Hakimi", "Aguerd", "Saiss", "Mazraoui", "Amrabat", "Ounahi", "Amallah", "Ziyech", "En-Nesyri", "Boufal"]
      }
    }
  ];
}

export function getSportsNews(): NewsArticle[] {
  return [
    {
      id: "news-1",
      title: "FIFA World Cup Schedule and Venues Confirmed",
      summary: "The official match calendar for the next FIFA World Cup tournament has been finalized, featuring expanded coverage and premier time-slots for international fans.",
      category: "WORLD CUP",
      publishedAt: "2 hours ago",
      readTime: "4 min read",
      author: "Edward Harrison"
    },
    {
      id: "news-2",
      title: "Tactical Evolution: The Rise of Fluid Formations in Modern Soccer",
      summary: "A deep editorial analysis on how managers are abandoning rigid shapes in favor of dynamic possession matrices and hybrid defender-midfielder transitions.",
      category: "TACTICAL STUDY",
      publishedAt: "5 hours ago",
      readTime: "7 min read",
      author: "Marcus Vane"
    },
    {
      id: "news-3",
      title: "Marcellus Elegance: The Styling Standards of EMJ Sports Arena",
      summary: "How design minimalism and editorial-grade layout structures enhance viewer satisfaction during high-stakes championship broadcasts.",
      category: "EXCLUSIVE",
      publishedAt: "1 day ago",
      readTime: "3 min read",
      author: "Dominic Thorne"
    },
    {
      id: "news-4",
      title: "Golden Generation: Strikers Ready to Dominate the Qualifiers",
      summary: "From Yamal's electric runs to Bellingham's powerhouse midfield presence, we profile the elite players carrying national expectations.",
      category: "PLAYER PROFILE",
      publishedAt: "1 day ago",
      readTime: "6 min read",
      author: "Sarah Sterling"
    },
    {
      id: "news-5",
      title: "Stadium Innovation: Next-Generation Broadcast Cameras",
      summary: "How ultra-high resolution cable cams and interactive AR overlays are redefining the home-viewing sports experience for live events.",
      category: "TECHNOLOGY",
      publishedAt: "2 days ago",
      readTime: "5 min read",
      author: "Julian Vance"
    }
  ];
}

export const mockComments = [
  "Tactical play from France in the second half.",
  "Messi's playmaking is unmatched tonight.",
  "What a strike! Incredible reflexes by the goalkeeper.",
  "This is peak tactical football, absolute mastery.",
  "The midfield pressure from Argentina is choking France's build-up.",
  "Mbappe is finding spaces, danger signs for Argentina.",
  "The refereeing today has been top tier.",
  "Is that a penalty? Let's check VAR.",
  "Incredible atmosphere in the stadium, the fans are roaring.",
  "This tempo is relentless. Truly a world-class final."
];
