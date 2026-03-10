const React = require('react');
console.log(React.version);
const ReactDOM = require('react-dom/server');
function App() {
  const [count, setCount] = React.useState(0);
  const cb = React.useEffectEvent(() => {});
  console.log("cb stable?", React.useRef(cb).current === cb);
  return React.createElement('div');
}
console.log(ReactDOM.renderToString(React.createElement(App)));
