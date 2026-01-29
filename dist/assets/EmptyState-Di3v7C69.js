import{c as r,r as a,j as e,f as h,U as p}from"./index-BilyvzY3.js";/**
 * @license lucide-react v0.452.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=r("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.452.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=r("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.452.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=r("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]),c={events:y,candidates:p,dashboard:h,default:x};function s({icon:t="default",title:n,message:d,actionLabel:o,onAction:i,className:l=""}){const m=c[t]||c.default;return e.jsxs("div",{className:`text-center py-12 px-4 ${l}`,children:[e.jsx("div",{className:"flex justify-center mb-4",children:e.jsx("div",{className:"w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center",children:e.jsx(m,{className:"w-8 h-8 text-gray-400"})})}),e.jsx("h3",{className:"text-lg font-semibold text-gray-900 mb-2",children:n}),e.jsx("p",{className:"text-gray-600 mb-6 max-w-md mx-auto",children:d}),o&&i&&e.jsxs("button",{onClick:i,className:"inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",children:[e.jsx(u,{className:"w-4 h-4"}),o]})]})}a.memo(s);const f=a.memo(function({onCreateEvent:n}){return e.jsx(s,{icon:"events",title:"No events found",message:"Get started by creating your first event. Events allow Operators to RSVP, check in, and vote for ROI winners.",actionLabel:"Create Event",onAction:n})}),b=a.memo(function(){return e.jsx(s,{icon:"candidates",title:"No candidates found",message:"Candidates will appear here once they submit applications for events."})}),g=a.memo(function(){return e.jsx(s,{icon:"dashboard",title:"No data available",message:"Dashboard metrics will appear here once you have events and activity in the system."})});export{f as E,g as a,b};
//# sourceMappingURL=EmptyState-Di3v7C69.js.map
