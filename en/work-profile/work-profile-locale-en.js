/* My Work Profile - English strings
 * Load order: work-profile-data-en.js, this file, then work-profile.js.
 *   text   : strings used by work-profile.js (keys and defaults are listed at the top of work-profile.js)
 *   static : strings for the markup in work-profile.html (elements with data-wp-i18n / data-wp-i18n-ph / data-wp-i18n-aria)
 *   chartLabelLineMax, summaryLabelMax : English names are longer, so labels wrap and truncate later than in Korean
 *   chartFont "page" : the chart follows the font of the host site
 */
window.WORK_PROFILE_LOCALE = {
  lang: "en",
  text: {
    modalTitles: ["", "Select your genres", "Select what you do", "Select the partner types you are looking for", "Done"],
    modalDescs: [
      "",
      "You can select every field you are active in.",
      "Your most representative role becomes your main position. Click a Secondary Position badge to make it your main position.",
      "You can also select positions from other genres.",
      ""
    ],
    next: "Next", register: "Complete", restart: "Start over",
    etcPlaceholder: "Type and press Enter",
    dupGenre: "This genre already exists", needGenreName: "Please enter a genre name",
    ownTag: "What I do", removeAria: "Remove {name}", needOther: "Please enter an item for Other.",
    posMain: "Main Position", posSub: "Secondary Position", posWish: "Desired Position", setMainTitle: "Set as main position",
    emptyQuery: 'No items match "{q}".', emptyWorks: "No matching items.", emptyWish: "No partner types available to select.",
    chartCaption: "Position distribution by genre", thGenre: "Genre", thDenom: "Total items in genre",
    chartAria: "Bar chart of the position distribution by genre. See the following table for the exact numbers.",
    tooltip: "{label}: {count} of {denom} ({pct}%)",
    sumActivity: "Active", sumWishGroup: "Desired", sumNotSelected: "Not selected", sumNone: "None",
    needItemInGenre: "Please select an item in the {genre} genre.",
    chartLabelLineMax: 14, summaryLabelMax: 30, chartFont: "page"
  },
  static: {
    title: "My Work Profile",
    titleDesc: "Select your work and the partners you want to meet to complete your profile.",
    openBtn: "Select My Work Profile",
    sumGenre: "Genre", sumWorks: "What I Do", sumWish: "Desired Partners",
    chartHead: "Position Distribution",
    posMain: "Main Position", posSub: "Secondary Position", posWish: "Desired Position",
    close: "Close",
    filterLabel: "Work Stage", filterHint: "Select a stage to show only its items.",
    searchWorksPh: "Search by item name (e.g. Distributor, Distribution)", searchWishPh: "Search by item name",
    searchAria: "Search by item name", searchClearAria: "Clear search",
    navAria: "Industry index",
    edit: "Edit", back: "Back", confirm: "Confirm"
  }
};
