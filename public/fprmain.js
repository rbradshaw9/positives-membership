// /public/fprmain.js
//
// FirstPromoter click tracking init script.
// Loaded before the FP CDN script so window.fpr exists when fpr.js runs.
// This sets the _fprom_track cookie from the ?fpr= URL param on landing.
//
// IMPORTANT: Do not modify — this file is served as-is by Next.js from /public.
// Account ID: 7nn3rxov (positives.firstpromoter.com)

(function(w){
  w.fpr = w.fpr || function() {
    w.fpr.q = w.fpr.q || [];
    w.fpr.q[arguments[0] === 'set' ? 'unshift' : 'push'](arguments);
  };
})(window);

fpr("init", {cid: "7nn3rxov"});
fpr("click");
