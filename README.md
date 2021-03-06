
<h1 align="center">micro-parsers</h1>
<div align="center">
  <strong>Body parsers extracted from Micro</strong>
</div>
<br>
<div align="center">
  <a href="https://npmjs.org/package/micro-parsers">
    <img src="https://img.shields.io/npm/v/micro-parsers.svg?style=flat-square" alt="npm package version" />
  </a>
  <a href="https://npmjs.org/package/micro-parsers">
  <img src="https://img.shields.io/npm/dm/micro-parsers.svg?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="standard JS linter" />
  </a>
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square" alt="prettier code formatting" />
  </a>
  <a href="https://travis-ci.org/tiaanduplessis/micro-parsers">
    <img src="https://img.shields.io/travis/tiaanduplessis/micro-parsers.svg?style=flat-square" alt="travis ci build status" />
  </a>
  <a href="https://github.com/tiaanduplessis/micro-parsers/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/micro-parsers.svg?style=flat-square" alt="project license" />
  </a>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="make a pull request" />
  </a>
</div>
<br>
<div align="center">
  <a href="https://github.com/tiaanduplessis/micro-parsers/watchers">
    <img src="https://img.shields.io/github/watchers/tiaanduplessis/micro-parsers.svg?style=social" alt="Github Watch Badge" />
  </a>
  <a href="https://github.com/tiaanduplessis/micro-parsers/stargazers">
    <img src="https://img.shields.io/github/stars/tiaanduplessis/micro-parsers.svg?style=social" alt="Github Star Badge" />
  </a>
  <a href="https://twitter.com/intent/tweet?text=Check%20out%20micro-parsers!%20https://github.com/tiaanduplessis/micro-parsers%20%F0%9F%91%8D">
    <img src="https://img.shields.io/twitter/url/https/github.com/tiaanduplessis/micro-parsers.svg?style=social" alt="Tweet" />
  </a>
</div>
<br>
<div align="center">
  Built with ❤︎ by <a href="https://github.com/tiaanduplessis">tiaanduplessis</a> and <a href="https://github.com/tiaanduplessis/micro-parsers/contributors">contributors</a>
</div>

<h2>Table of Contents</h2>
<details>
  <summary>Table of Contents</summary>
  <li><a href="#about">About</a></li>
  <li><a href="#install">Install</a></li>
  <li><a href="#usage">Usage</a></li>
  <li><a href="#contribute">Contribute</a></li>
  <li><a href="#license">License</a></li>
</details>

## About

The `buffer`, `text` and `json` body parsers extracted from [Micro](https://github.com/zeit/micro#body-parsing).


## Install

```sh
$ npm install micro-parsers
# OR
$ yarn add micro-parsers
```

## Usage

Example extracted from from [Micro README](https://github.com/zeit/micro#body-parsing). See it for more usage examples.

```js
const {buffer, text, json} = require('micro-parsers')

module.exports = async (req, res) => {
  const buf = await buffer(req)
  console.log(buf)
  // <Buffer 7b 22 70 72 69 63 65 22 3a 20 39 2e 39 39 7d>
  const txt = await text(req)
  // '{"price": 9.99}'
  const js = await json(req)
  // { price: 9.99 }
  console.log(js.price)
  return ''
}
```

## Contributing

Contributions are welcome!

1. Fork it.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

Or open up [a issue](https://github.com/tiaanduplessis/micro-parsers/issues).

## License

Licensed under the MIT License.
