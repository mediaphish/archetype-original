import{c,r as s,j as e,f as y,U as u}from"./index--duSovw8.js";/**
 * @license lucide-react v0.452.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=c("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.452.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=c("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.452.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=c("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]),l={events:p,candidates:u,dashboard:y,search:d,default:d};function n({icon:a="default",title:t,message:r,actionLabel:o,onAction:i,className:h=""}){const m=l[a]||l.default;return e.jsxs("div",{className:`text-center py-12 px-4 ${h}`,children:[e.jsx("div",{className:"flex justify-center mb-4",children:e.jsx("div",{className:"w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center",children:e.jsx(m,{className:"w-8 h-8 text-gray-400"})})}),e.jsx("h3",{className:"text-lg font-semibold text-gray-900 mb-2",children:t}),e.jsx("p",{className:"text-gray-600 mb-6 max-w-md mx-auto",children:r}),o&&i&&e.jsxs("button",{onClick:i,className:"min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",children:[e.jsx(x,{className:"w-4 h-4"}),o]})]})}s.memo(n);const v=s.memo(function({onCreateEvent:t}){return e.jsx(n,{icon:"events",title:"No events found",message:"Get started by creating your first event. Events allow Operators to RSVP, check in, and vote for ROI winners.",actionLabel:"Create Event",onAction:t})}),b=s.memo(function(){return e.jsx(n,{icon:"candidates",title:"No candidates found",message:"Candidates will appear here once they submit applications for events."})}),g=s.memo(function({onCreateEvent:t,onViewEvents:r}){const o=t?"Create Event":r?"View Events":null,i=t||r;return e.jsx(n,{icon:"dashboard",title:"No data available",message:"Dashboard metrics will appear here once you have events and activity in the system. Create your first event to get started.",actionLabel:o,onAction:i})});s.memo(function({onClear:t}){return e.jsx(n,{icon:"search",title:"No results found",message:"Try adjusting your search or filters to find what you're looking for.",actionLabel:t?"Clear search":void 0,onAction:t})});export{v as E,g as a,b};
//# sourceMappingURL=EmptyState-DzX-23yb.js.map
