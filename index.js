exports.handler = async (event, context, callback) => {
  require('dotenv').config();
  const axios = require('axios');
  const params = { access_key: process.env.ACCESS_KEY };
  const list = require('./stockList.json');
  const memo = ['AC.XPAR', 'ADP.XPAR', 'AF.XPAR', 'AI.XPAR', 'AIR.XPAR', 'ABIO.XPAR', 'ALD.XPAR', 'ALO.XPAR', 'ATE.XPAR',
    'AMUN.XPAR', 'AKE.XPAR', 'ATO.XPAR', 'CS.XPAR', 'BB.XPAR', 'BIM.XPAR', 'BNP.XPAR', 'BVI.XPAR', 'CAP.XPAR', 'CA.XPAR',
    'CO.XPAR', 'CGG.XPAR', 'CNP.XPAR', 'COFA.XPAR', 'COV.XPAR', 'ACA.XPAR', 'BN.XPAR', 'DBG.XPAR', 'EDEN.XPAR', 'EDF.XPAR',
    'FGR.XPAR', 'ELIOR.XPAR', 'ELIS.XPAR', 'ENGI.XPAR', 'ERA.XPAR', 'EL.XPAR', 'RF.XPAR', 'ERF.XPAR', 'ETL.XPAR', 'EO.XPAR',
    'GFC.XPAR', 'GET.XPAR', 'ICAD.XPAR', 'NK.XPAR', 'ITP.XPAR', 'IPN.XPAR', 'DEC.XPAR', 'LR.XPAR', 'OR.XPAR', 'MDM.XPAR',
    'MCPHY.XPAR', 'ML.XPAR', 'NEOEN.XPAR', 'NEX.XPAR', 'ORA.XPAR', 'RI.XPAR', 'POM.XPAR', 'PUB.XPAR', 'RCO.XPAR', 'RNO.XPAR',
    'RXL.XPAR', 'RUI.XPAR', 'SAF.XPAR', 'SGO.XPAR', 'DIM.XPAR', 'SU.XPAR', 'SCR.XPAR', 'SK.XPAR', 'GLE.XPAR', 'SW.XPAR',
    'SOI.XPAR', 'S30.XPAR', 'SOLB.XBRU', 'SOP.XPAR', 'SPIE.XPAR', 'STLA.XPAR', 'STM.XPAR', 'HO.XPAR', 'UBI.XPAR', 'FR.XPAR',
    'VK.XPAR', 'VLA.XPAR', 'VIE.XPAR', 'VRLA.XPAR', 'DG.XPAR', 'VIRP.XPAR', 'ALCLS.XPAR'];

  const options = {
    from: process.env.EMAIL_SENDER,
    to: process.env.EMAIL_RECEIVER,
    subject: 'Stock Picker Helper!',
    text: ``
  }

  function chunk(items, size) {
    const chunks = [];
    items = [].concat(...items);

    while (items.length) chunks.push(items.splice(0, size));

    return chunks;
  }

  /* const result = memo.reduce((previousValue, currentValue) => {
    return previousValue
      .then(acc => sequencedPromises(currentValue)
        .then(res => [...acc, res]))
  }, Promise.resolve([])); */

  const _memo = chunk(memo, 5);

  /**
   * The API of Marketstack allow only 5 request per seconds
   * @param id
   * @return {Promise<unknown>}
   */
  function sequencedPromises(id) {
    return new Promise((resolve => {
      setTimeout(() => {
        const fetch = axios.get(`https://api.marketstack.com/v1/eod?access_key=${ params.access_key }&symbols=${ id }`, { params })
          .then(res => {
            analyze(res?.data?.data);

            options.text += '\n';

            if (_consecutiveDecreases(res?.data?.data, 11).every(Boolean)) {
              return options.text += `${list[res?.data?.data?.[0].symbol].name} (${res?.data?.data?.[0].symbol}) Baisse consécutive : 10 jours\n--------\n`;
            }
            if (_consecutiveDecreases(res?.data?.data, 6).every(Boolean)) {
              return options.text += `${list[res?.data?.data?.[0].symbol].name} (${res?.data?.data?.[0].symbol}) Baisse consécutive : 5 jours\n--------\n`;
            }
            if (_consecutiveDecreases(res?.data?.data, 5).every(Boolean)) {
              options.text += `${list[res?.data?.data?.[0].symbol].name} (${res?.data?.data?.[0].symbol}) Baisse consécutive : 4 jours\n--------\n`;
            }
          });
        return resolve(fetch);
      }, 1000)
    }));
  }

  const result = _memo.reduce((previousValue, currentValue) => {
    return previousValue
      .then(acc => currentValue.reduce((prev, current) => {
        return sequencedPromises(current)
      }, previousValue)
        .then(res => [ ...acc, res ]))
  }, Promise.resolve([]));

  function analyze(res) {
    const rules = {
      1: (ctx) => ({ range: 1, value: (ctx[0]?.close - ctx[0]?.close) / ctx[0]?.close * 100, rule: -4 }),
      2: (ctx) => ({ range: 2, value: (ctx[0]?.close - ctx[1]?.close) / ctx[0]?.close * 100, rule: -8 }),
      3: (ctx) => ({ range: 3, value: (ctx[0]?.close - ctx[2]?.close) / ctx[0]?.close * 100, rule: -8 }),
      4: (ctx) => ({ range: 4, value: (ctx[0]?.close - ctx[3]?.close) / ctx[0]?.close * 100, rule: -8 }),
      10: (ctx) => ({ range: 10, value: (ctx[0]?.close - ctx[9]?.close) / ctx[0]?.close * 100, rule: -15 }),
      15: (ctx) => ({ range: 15, value: (ctx[0]?.close - ctx[14]?.close) / ctx[0]?.close * 100, rule: -15 }),
      30: (ctx) => ({ range: 30, value: (ctx[0]?.close - ctx[29]?.close) / ctx[0]?.close * 100, rule: -20 }),
      50: (ctx) => ({ range: 50, value: (ctx[0]?.close - ctx[49]?.close) / ctx[0]?.close * 100, rule: -25 }),
      90: (ctx) => ({ range: 90, value: (ctx[0]?.close - ctx[89]?.close) / ctx[0]?.close * 100, rule: -25 }),
    };

    return Object.values(rules).map((rule) => {
      const calcule = rule(res);
      if (calcule.value <= calcule.rule) {
        options.text += `${list[res[0].symbol].name} (${res[0].symbol}) baisse de ${calcule.value.toFixed(2)}% sur les ${calcule.range} derniers jours.\n`
      }
    });
  }

  function _consecutiveDecreases(stocks, nbDays) {
    const _res = stocks.splice(0, nbDays);

    return _res.reduce((acc, current, i) => {
      if (i >= (nbDays - 1)) return acc;
      acc.push(current.adj_close < _res[i + 1].adj_close);
      return acc;
    }, []);
  }

  async function sendMail() {
    const nodemailer = require('nodemailer');
    const smtpTransport = require('nodemailer-smtp-transport');

    const transporter = nodemailer.createTransport(smtpTransport({
      host: process.env.HOST,
      service: process.env.SERVICE,
      auth: {
        user: process.env.EMAIL_SENDER,
        pass: process.env.PASS
      }
    }));

    await transporter.sendMail(options, function(error) {
      if (error) {
        return console.log('error, response: ', {
          statusCode: 500,
          body: JSON.stringify({
            error: error.message,
          }),
        });
      }

      console.log('email sent !');
    });
  }

  callback(null, result.then(async () => {
    if (options.text.length > 1) return await sendMail();
    console.log('No email to send today!');
  }));
}
