import feature from './utils/feature';


//  Google Analytics injection.

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
window.ga('create', 'UA-97851584-1', 'auto');
window.ga('send', 'pageview');


const verbosity = 1;


/*

https://github.com/puckey/you-move-me/issues/315

✔️ = Done.
L = Covered by hyperlink click tracking.
? = Questionable if possible or worthwhile.
T = T/K.

Homepage
L  No. of users who click ?
L  No. of users who click Enter VR
L  No. of users who click Add Performance
-  No. of users coming from a shared link
  No. of clicks into heads and orb
  No. of users who reach end credits

About
?  Time spent on each section of the about page (we did this on the madeby.google website)

Enter VR
✔️  No. of users who see Enter VR error ****** sort of... TO BE CONTINUED
✔️  Time spent watching in VR
✔️  No. of users watching Polyfill
✔️  No. of users watching WebVR

Add Performance | Tutorial
L  No. of users who skip the tutorial
L  No. of users who close the tutorial
L  No. of users who add performance (after tutorial)
?  No. of users who see error (after tutorial)

Add Performance | Record
  No. of rounds recorded per session
  Time spent recording a dance before user submits
  No. of users who submit
  No. of users who record again (can we do this?)

Add Performance | Share
L  No. of shares on FB
L  No. of shares on G+
L  No. of shares on T

VR device detection
.  No. users on mobile WebVR
.  No. users on mobile WebVR Polyfill
✔️  No. users on Vive
✔️  No. users on Oculus
✔️  No. users on Samsung Gear

Outbound links
L  Homepage & About - User clicks on WebVR badge
L  Homepage & About - User clicks on terms
L  Homepage & About - User clicks on privacy
L  About - User clicks source code link
L  About - User clicks on technical case study link
L  About - User clicks on any sublinks from tech section (under technology section)


*/


const analytics = {
  //  Super general event recording. Most stuff gets funneled through this.
  record: (obj) => {
    if (verbosity >= 0.5) console.log('Note:', obj);
    if (window.ga !== undefined && typeof window.ga === 'function') {
      window.ga('send', obj);
      if (verbosity >= 0.5) console.log('Noted.');
    }
  },
  //  This is basically “bounce” event recording.
  recordOutboundLink: (a) => {
    const url = a.getAttribute('href');
    if (verbosity >= 0.5) console.log('Note:', url);
    if (window.ga !== undefined && typeof window.ga === 'function') {
      window.ga('send', 'event', 'outbound', 'click', url, {
        transport: 'beacon',
        hitCallback: function () {},
        //hitCallback: function(){ document.location = url }
      });
    }
    return true;
  },
  sectionEnteredAt: Date.now(),
  recordSectionChange: (a) => {
    analytics.sectionDuration = null;
    if (analytics.sectionSwitchedAt !== undefined) {
      analytics.sectionDuration = (Date.now() - analytics.sectionSwitchedAt) / 1000;
      // **** record sectionDuration separate? Or as "value" attribute in link recording???
    }
    analytics.sectionSwitchedAt = Date.now();
    // const url = a.getAttribute('href');
    // if (window.ga !== undefined && typeof window.ga === 'function') {
    //   window.ga('send', 'event', 'outbound', 'click', url, {
    //     transport: 'beacon',
    //     hitCallback: function () {},
    //     //hitCallback: function(){ document.location = url }
    //   });
    // }
    // return true;
  },
  recordInternalLink: (a) => { // ****** HOW IS THIS DIF THAN ABOVE?????????
    // const url = a.getAttribute('href');
    // if (verbosity >= 0.5) console.log('Note:', url);
    // if (window.ga !== undefined && typeof window.ga === 'function') {
    //   window.ga('send', 'event', 'outbound', 'click', url, {
    //     transport: 'beacon',
    //     hitCallback: function () {},
    //     //hitCallback: function(){ document.location = url }
    //   });
    // }
    // return true;
  },


  //  -------------------------------------------------- VR Session: VR entry / exit ATTEMPT
  //  NOTE: These functions must be called manually
  //  when the user clicks or taps to initiate a VR
  //  session. Compare to VR entry / exit SUCCESS below.
  recordVREntryAttempt: () => {
    analytics.record({
      hitType: 'event',
      eventCategory: 'VR Session',
      eventAction: 'VR Entry',
      eventLabel: 'VR entry attempted',
    });
  },
  recordVRExitAttempt: () => {
    analytics.record({
      hitType: 'event',
      eventCategory: 'VR Session',
      eventAction: 'VR Exit',
      eventLabel: 'VR exit attempted',
    });
  },


  mount: () => {
    /*

    Some things already covered by Google Analytics:
    - Platform (divided by device, OS, browser, etc.)
    - Desktop vs Mobile (divded into phone / tablet)
    - Inbound links (divided into Direct, Social, etc.)
    - Total time on site.

    *******
    need to add look through all anchor elements to add link tracking.
    inbound vs outbound vs section change tracking???

    */
    //  -------------------------------------------------- Capabilities: WebGL
    if (feature.hasWebGL) {
      analytics.record({
        hitType: 'event',
        eventCategory: 'Capabilities',
        eventAction: 'WebGL Detect',
        eventLabel: 'WebGL is present',
        nonInteraction: true,
      });
    } else {
      analytics.record({
        hitType: 'event',
        eventCategory: 'Capabilities',
        eventAction: 'WebGL Detect',
        eventLabel: 'WebGL is absent',
        nonInteraction: true,
      });
    }
    //  -------------------------------------------------- Capabilities: WebVR
    if (feature.hasWebVR) {
      analytics.record({
        hitType: 'event',
        eventCategory: 'Capabilities',
        eventAction: 'WebVR API Detect',
        eventLabel: 'WebVR API is present',
        nonInteraction: true,
      });
    } else {
      analytics.record({
        hitType: 'event',
        eventCategory: 'Capabilities',
        eventAction: 'WebVR API Detect',
        eventLabel: 'WebVR API is absent',
        nonInteraction: true,
      });
    }
    //  -------------------------------------------------- Capabilities: VR Displays
    if (feature.vrDisplays.length > 0) {
      analytics.record({
        hitType: 'event',
        eventCategory: 'Capabilities',
        eventAction: 'VR Displays Detect',
        eventLabel: 'VR Displays are present',
        value: feature.vrDisplays.length,
        nonInteraction: true,
      });
    } else {
      analytics.record({
        hitType: 'event',
        eventCategory: 'Capabilities',
        eventAction: 'VR Displays Detect',
        eventLabel: 'VR Displays are absent',
        nonInteraction: true,
      });
    }
    //  -------------------------------------------------- Capabilities: VR device STRING
    //  NOTE: We’re only recording the primary VR device,
    //  ie. whatever’s in vrDisplays[0], because that’s what
    //  our code will render for. They might have two VR
    //  devices, like a Rift and Vive, but we want to know
    //  what they’re actually using for this experience.
    if (feature.vrDisplay) {
      analytics.record({
        hitType: 'event',
        eventCategory: 'Capabilities',
        eventAction: 'VR Device String',
        eventLabel: feature.vrDisplay.displayName,
        nonInteraction: true,
      });
    }
    //  -------------------------------------------------- Capabilities: VR device BUCKET
    //  Subtle difference between STRING and BUCKET is these
    //  names below correspond to our own feature detection
    //  buckets while the STRING is the raw displayName reported
    //  directly from vrDisplay without intervention.
    if (feature.vrDisplay) {
      (function () {
        const obj = {
          hitType: 'event',
          eventCategory: 'Capabilities',
          eventAction: 'VR Device Bucket',
          nonInteraction: true,
        };
        if (feature.isVive) {
          obj.eventLabel = 'HTC Vive';
        } else if (feature.isOculus) {
          obj.eventLabel = 'Oculus';//  Note that “Rift” is not part of the name.
        } else if (feature.isSamsungGearVR) {
          obj.eventLabel = 'Samsung GearVR';
        } else if (feature.isDaydream) {
          obj.eventLabel = 'Google Daydream';
        } else if (feature.isCardboard) {
          obj.eventLabel = 'Cardboard (fallback)';// isMobile + Polyfill (ie NOT Daydream)
        } else obj.eventLabel = 'Unknown';
        analytics.record(obj);
      }());
    }
    //  -------------------------------------------------- VR Session: VR entry / exit SUCCESS
    if (feature.vrDisplay) {
      window.addEventListener('vrdisplaypresentchange', () => {
        if (feature.vrDisplay.isPresenting) { // ******* MAKE SURE THIS IS NOT ACCIDENTALLY REVERSED!!!!!!!!!!!!!!!!!!!!!!!!!!
          analytics.vrSessionBeganAt = Date.now();
          analytics.record({
            hitType: 'event',
            eventCategory: 'VR Session',
            eventAction: 'VR Entry',
            eventLabel: 'VR entry successful',
            nonInteraction: true, //  The ATTEMPT is an interaction. Its SUCCESS is not.
          });
        } else {
          analytics.vrSessionEndedAt = Date.now();
          analytics.vrSessionDuration = null;
          if (analytics.vrSessionBeganAt !== undefined) {
            analytics.vrSessionDuration = (analytics.vrSessionEndedAt -
              analytics.vrSessionBeganAt) / 1000;
          }
          analytics.record({
            hitType: 'event',
            eventCategory: 'VR Session',
            eventAction: 'VR Exit',
            eventLabel: 'VR exit successful',
            value: analytics.vrSessionDuration, //  Unit here is seconds, accurate to milliseconds.
            nonInteraction: true, //  The ATTEMPT is an interaction. Its SUCCESS is not.
          });
        }
      }, false);
    }
    //  -------------------------------------------------- VR controller stats?!?!?!
  },
};


export default analytics;


/*

Outbound links

  Homepage & About - User clicks on WebVR badge
  Homepage & About - User clicks on terms
  Homepage & About - User clicks on privacy
  About - User clicks source code link
  About - User clicks on technical case study link
  About - User clicks on any sublinks from tech section (under technology section)

  clickedHomepageWebVRBadge
  clickedHomepageTerms
  clickedHomepagePrivacy
  clickedAboutSourceCode
  clickedAboutTCS
  clicked ... any sublinks from tech section (under technology section)

*/
