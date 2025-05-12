(function() {
    // 1) Defaults e URLs
    var DEFAULT_GEO = { city:'', st:'', country:'', zp:'', ip:'' };
    var GEO_URL     = 'https://ipapi.co/json/?key=Vp36YgwyV4FHt5L0Vzj5BnCXtmiED7ivUdPqHt0f6Nqbr7TEV6';
    var TIMEOUT_MS  = 1000;

    // 2) onDOMReady
    function onDOMReady(cb) {
        if (document.readyState !== 'loading') return cb();
        document.addEventListener('DOMContentLoaded', cb);
    }

    // 3) Carrega CryptoJS
    function loadCryptoJS(cb) {
        if (window.CryptoJS) return cb();
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
        s.onload = cb;
        s.onerror = cb;
        document.head.appendChild(s);
    }

    // 4) Utilitários
    var utils = {
        getURLParam: k => new URLSearchParams(location.search).get(k) || '',
        getUTMParams: () => {
            var p = new URLSearchParams(location.search);
            return {
                utm_source:   p.get('utm_source')   || '',
                utm_medium:   p.get('utm_medium')   || '',
                utm_campaign: p.get('utm_campaign') || '',
                utm_id:       p.get('utm_id')       || '',
                utm_term:     p.get('utm_term')     || '',
                utm_content:  p.get('utm_content')  || ''
            };
        },
        getFBCookies: () => {
            var p = new URLSearchParams(location.search), fbclid = p.get('fbclid'), fbc = '', fbp = '';
            if (fbclid) fbc = 'fb.1.' + Math.floor(Date.now()/1000) + '.' + fbclid;
            document.cookie.split('; ').forEach(c => {
                var kv = c.split('=');
                if (kv[0] === '_fbc') fbc = kv[1];
                if (kv[0] === '_fbp') fbp = kv[1];
            });
            return { fbc, fbp };
        },
        hashData: str => {
            str = str ? String(str).trim().toLowerCase() : '';
            if (!str || !window.CryptoJS) return '';
            return CryptoJS.SHA256(str).toString();
        },
        getGeoData: function(cb) {
            var done = false;
            var to = setTimeout(() => { if (!done) { done = true; cb(DEFAULT_GEO); } }, TIMEOUT_MS);
            fetch(GEO_URL)
                .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(d => {
                    if (!done) {
                        done = true; clearTimeout(to);
                        cb({ city: d.city||'', st: d.region_code||'', country: d.country_code||'', zp: d.postal||'', ip: d.ip||'' });
                    }
                })
                .catch(() => { if (!done) { done = true; clearTimeout(to); cb(DEFAULT_GEO); } });
        }
    };

    // 5) Função de processamento de links sempre disponível
    function processPaymentLinks() {
        var sel  = 'a[href*="pay.hotmart.com"], a[href*="greenn.com.br"], a[href*="payfast.greenn.com.br"]',
            slug = location.pathname.replace(/^\//,'').replace(/\/$/,''),
            u   = utils.getUTMParams(),
            ublk= [u.utm_id,u.utm_source,u.utm_campaign,u.utm_medium,u.utm_content,u.utm_term].join('|'),
            xcod= ['mac_id','gac_id','tiktok_id','s_as_id','s_ad_id']
                  .map(utils.getURLParam).filter(Boolean).join('|');

        var links = document.querySelectorAll(sel);
        console.log('processPaymentLinks: encontrados', links.length, 'links');
        links.forEach(a => {
            var href = a.href,
                sep  = href.includes('?') ? '&' : '?',
                params = href.includes('hotmart.com')
                       ? 'sck='+ublk+'&xcod='+xcod+'&src='+slug
                       : 'utm_source='+ublk+'&xcod='+xcod+'&src='+slug;
            a.href = href + sep + params;
        });
    }

    // 6) setupForm opcional
    function setupForm(geo) {
        var form = document.querySelector('form');
        if (!form) return () => {};
        var updateHidden = () => {
            var now = Math.floor(Date.now()/1000), u = utils.getUTMParams(), fb = utils.getFBCookies(), v = {};
            ['name','email','doc','phone'].forEach(k => v[k] = (form.querySelector('[name="'+k+'"]')||{}).value||'');
            var jsonpx = { data: [{ event_name: 'Lead', event_time: now, event_source_url: location.href,
                action_source: 'website', user_data: {
                    em: utils.hashData(v.email), ph: utils.hashData(v.phone.replace(/\D/g,'')),
                    ct: utils.hashData(geo.city), st: utils.hashData(geo.st), zp: utils.hashData(geo.zp), country: utils.hashData(geo.country),
                    client_ip_address: geo.ip, client_user_agent: navigator.userAgent, fbp: fb.fbp, fbc: fb.fbc,
                    external_id: utils.hashData(geo.ip)
                }, custom_data: Object.assign({ currency: 'BRL', content_type: 'lead', event_day: new Date().getDate(), event_time_interval: new Date().toISOString() }, u)
            }], test_event_code: '' };
            var hf = document.getElementById('form-field-jsonpx'); if (hf) hf.value = JSON.stringify(jsonpx);
            console.log('updateHidden executed');
            processPaymentLinks();
        };
        form.querySelectorAll('input').forEach(i => i.addEventListener('input', updateHidden));
        updateHidden();
        return updateHidden;
    }

    // 7) Inicialização
    onDOMReady(() => {
        console.log('DOM ready');
        // primeiro processamento de links sem esperar geo
        processPaymentLinks();
        loadCryptoJS(() => {
            console.log('CryptoJS loaded');
            var geo = Object.assign({}, DEFAULT_GEO);
            var triggerForm = setupForm(geo);
            utils.getGeoData(fetched => {
                console.log('GeoData fetched:', fetched);
                Object.assign(geo, fetched);
                // atualiza form e links com geo
                triggerForm();
                processPaymentLinks();
            });
        });
    });
})();
