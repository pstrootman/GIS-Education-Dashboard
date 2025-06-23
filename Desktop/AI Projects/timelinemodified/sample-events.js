// Sample JavaScript file for testing timeline import functionality
const events = [
  // Single date events
  { title: "World War I Begins", year: 1914, description: "The Great War starts with the assassination of Archduke Franz Ferdinand." },
  { title: "World War I Ends", year: 1918, description: "Armistice signed, ending the Great War." },
  
  // Date range events
  { title: "World War II", startYear: 1939, endYear: 1945, description: "Global conflict involving most of the world's nations." },
  { title: "Cold War Era", startYear: 1947, endYear: 1991, description: "Period of geopolitical tension between the United States and Soviet Union." },
  
  // Events with custom perspectives
  { 
    title: "Moon Landing", 
    year: 1969, 
    description: "Apollo 11 mission successfully lands humans on the moon.",
    perspective: "Space Exploration"
  },
  { 
    title: "Internet Created", 
    year: 1983, 
    description: "TCP/IP protocol is standardized, creating the modern internet.",
    perspective: "Technology"
  },
  
  // Events with custom colors
  { 
    title: "Berlin Wall Falls", 
    year: 1989, 
    description: "Symbol of the Cold War is torn down.",
    color: "#e74c3c"
  },
  
  // Recent events
  { 
    title: "COVID-19 Pandemic", 
    startYear: 2020, 
    endYear: 2023, 
    description: "Global pandemic caused by SARS-CoV-2 virus.",
    perspective: "Health Crisis"
  },
  
  // Events with precise dates
  {
    title: "9/11 Attacks",
    startDate: "2001-09-11T08:46",
    description: "Terrorist attacks on the World Trade Center and Pentagon."
  }
];