# SMT X / TC System

DISCLAIMER: This system was whipped together in a couple weeks following the release of LionWing's Tokyo Conception. Personally, I play and run the Mato Tokyo 200X system, and although X and TC are similar in many ways, X is more complex and has additional data, terms, and elements not present in TC. Please temper your expectations, and ignore the aspects of the system which are unnecessary for playing TC.

DISCLAIMER: There will be NO COMPENDIA support hosted via this system's installation. Do not ask for it.

DISCLAIMER: This project has no affiliation with LionWing, or Tokyo Conception. Please refrain from contacting any of LionWing's staff or moderators concerning this system, they will not be able to answer any of your questions. This system was not "designed for" the Tokyo Conception TTRPG, but merely offers compatibility with it.

## How to install
Paste this manifet link: `https://github.com/Alondaar/smt-200x/raw/main/system.json` into the bottom of the system installation popup window within Foundry.

## How to use
If you're familiar with Foundry VTT, you should know that there is a lot to explore in the UI and buttons of many systems. I urge you to inspect the system config settings, as well as closely read the names/header/descriptions of various fields and understand their effects on the sheet.

You can use a large portion of the sheet's power with just inputting your base stats, and clicking the POWER / TN fields in the header. However, looking at the Action / Skill table is where the majority of the magic can happen, if you take the time to set it up. Please refer to the video below for an in-depth tour of the system.

## Attribute Key References
Here is a list of common @keys you can use in the various TN / POWER fields around the sheet (namely for Actions / Skills).
NOTE: Exploding rolls (such as for Power rolls) should be made with "d10x"
- `@st.`, `@mg.`, `@vt.`, `@ag.`, `@lk.`
  - written as `@st.value` or `@st.tn` for the total base stat or target number
- `@lvl` the actor's current level
- `@meleePower`, `@rangedPower`, `@spellPower`
  - returns a shorthand for the currently calculated power
- `@powerDice.`
  - `.melee`, `.ranged`, `.spell`, `.item`, `.init` written as `@powerDice.melee`
  - Note this returns a single value, you will need to add the "d10x" if you want an actual dice roll to occur.

 ## System Tour Video
[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/1BWq_6YXBZk/0.jpg)](https://www.youtube.com/watch?v=1BWq_6YXBZk)
 

Please report any bugs, issues, or feedback to Alondaar on Discord (my own, or in the dedicated thread on LionWing's SMT-Homebrew channel). You may also file issues on this repository.

Feel free to fork or get in touch with me if you want to make contributions to the system. This is my first time making a system at all, so "best practices" were not employed.

Made using <https://github.com/asacolips-projects/boilerplate> as a base.
