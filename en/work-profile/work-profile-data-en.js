/* My Work Profile - master data, English edition (genre > work stage > item)
 * Same structure as work-profile-data.js (Korean). Names are English and are also the selection keys,
 * so getSelection() returns English names together with the server codes.
 * etc: the internal names of "Other" (the free-input genre, stage and item).
 */
window.WORK_PROFILE_DATA = {
  etc: { genre: "Other", stage: "Other", item: "Other" },
  codes: {
    genres: {"Broadcasting": "002001", "Game": "002002", "Character": "002003", "Cartoon": "002004", "Animation": "002005", "Fashion": "002006", "Music": "002007", "Immersive Content": "002009", "Story": "002011", "Other": "002010"},
    stages: {},
    items: {}
  },
  stageOrder: ["Planning", "Investment", "Production", "Production Support & Tech", "Distribution", "Platform & Service", "Agency & Brokerage", "Marketing & PR", "Manufacturing & Merchandising", "Institutions & Associations"],
  data: {
    "Broadcasting": {
      "Planning": ["Distributor", "IP Business Development"],
      "Investment": ["VC / Investor", "Government Agency"],
      "Production": ["Production Company", "Short-form Content Producer"],
      "Production Support & Tech": ["VFX / Virtual Production Studio", "Broadcast Video Technology", "Post-Production", "Technical Service", "Systems / Software", "Equipment / Manufacturing", "Consulting"],
      "Distribution": ["Broadcaster", "OTT/IPTV", "FAST TV", "Short-form Platform"],
      "Platform & Service": ["MCN"],
      "Agency & Brokerage": ["Sales Agent", "Licensing Agent", "Media Agency / Brand", "Talent Booking Agency", "Advertising / PR"],
      "Other": ["Other"]
    },
    "Game": {
      "Planning": ["IP Business Development"],
      "Investment": ["Game Investment", "VC (Investor)"],
      "Production": ["Developer"],
      "Production Support & Tech": ["Game Production Support / Technology"],
      "Distribution": ["Publisher", "Game Marketing"],
      "Platform & Service": ["Game Service Platform"],
      "Institutions & Associations": ["Game Institution / Association"],
      "Other": ["Other"]
    },
    "Animation": {
      "Planning": ["Copyright-holding Distributor", "IP Business Development"],
      "Investment": ["Investor", "Public Institution"],
      "Production": ["Producer (Own IP)", "Production Service Studio (Subcontract)"],
      "Production Support & Tech": ["Post-Production", "Consulting"],
      "Distribution": ["TV Broadcaster", "Online / Mobile Platform", "OTT/IPTV", "FAST TV"],
      "Agency & Brokerage": ["Sales Agent", "Licensing Agent"],
      "Manufacturing & Merchandising": ["Manufacturing / Merchandising (Toys / Goods)"],
      "Other": ["Other"]
    },
    "Cartoon": {
      "Planning": ["IP Business Development"],
      "Production": ["Comics Publisher", "General Publisher (Comics Division)", "Digital Comics CP", "Webtoon CP"],
      "Production Support & Tech": ["Localization Company"],
      "Distribution": ["Webtoon Overseas Distributor"],
      "Platform & Service": ["Digital Comics Service", "Webtoon Service"],
      "Agency & Brokerage": ["Webtoon Content Agent"],
      "Other": ["Other"]
    },
    "Character": {
      "Planning": ["Licensor", "IP Business Development"],
      "Investment": ["Investor"],
      "Production": ["Character Studio (Design / Planning)"],
      "Production Support & Tech": ["Licensing Solution / Technical Service Provider"],
      "Distribution": ["Retailer"],
      "Platform & Service": ["Character Play / Experience Venue Operator"],
      "Agency & Brokerage": ["Licensing Agent"],
      "Marketing & PR": ["IP Merchandising / Marketing Agency"],
      "Manufacturing & Merchandising": ["Licensee / Manufacturer"],
      "Other": ["Other"]
    },
    "Music": {
      "Planning": ["Music Publisher", "IP Business Development"],
      "Production": ["Music Production Company (Label / Agency)"],
      "Production Support & Tech": ["Music Production Support (Studio / Engineering)"],
      "Distribution": ["Music Distributor"],
      "Platform & Service": ["Digital Music Service", "Fandom Platform"],
      "Agency & Brokerage": ["Live Performance Promoter"],
      "Marketing & PR": ["Music Marketing / PR Agency (Fandom / SNS / Overseas Promotion)"],
      "Manufacturing & Merchandising": ["Supplementary Content Production"],
      "Institutions & Associations": ["Copyright Collective Management Organization"],
      "Other": ["Other"]
    },
    "Fashion": {
      "Planning": ["IP / Licensing (Brand / Character)", "IP Business Development"],
      "Production": ["Designer Brand"],
      "Production Support & Tech": ["Pattern / Sample Room"],
      "Distribution": ["Overseas Distribution Agency", "Logistics Agency", "Department Store / Offline Retailer"],
      "Platform & Service": ["Online Select Shop"],
      "Agency & Brokerage": ["Showroom", "Buying Office", "Sourcing Agent"],
      "Manufacturing & Merchandising": ["OEM/ODM Manufacturer (Vendor)"],
      "Other": ["Other"]
    },
    "Immersive Content": {
      "Planning": ["IP Licensing Agency", "IP Business Development"],
      "Investment": ["Investor"],
      "Production": ["Immersive Content (XR) Producer", "Virtual Human / Idol Studio", "AI-based Content Production / Solution"],
      "Production Support & Tech": ["Motion Capture Specialist"],
      "Platform & Service": ["XR Platform"],
      "Manufacturing & Merchandising": ["Immersive Exhibition / Experience Facility Builder"],
      "Other": ["Other"]
    },
    "Story": {
      "Planning": ["IP Business Development"],
      "Production": ["Web Novel CP (Author Scouting / Editing / Serialization / Management)"],
      "Distribution": ["Audiobook / Audio Drama Producer & Distributor"],
      "Platform & Service": ["Web Novel Platform / Publisher"],
      "Agency & Brokerage": ["Literary Rights Agency (Overseas Rights Import / Export)", "Web Novel / Webtoon Derivative Works (Adaptation) Agent"],
      "Other": ["Other"]
    },
    "Other": {
      "Other": ["Other"]
    }
  }
};
