const React = require('react');

function App() {
  const cb = React.useEffectEvent(() => {});
  return cb;
}

const cb1 = App();
const cb2 = App();
console.log("Are they the same?", cb1 === cb2);
