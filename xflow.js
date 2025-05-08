<script>
(function() {
    // 1) Espera o DOM
    function onDOMReady(cb) {
        if (document.readyState !== 'loading') return cb();
        document.addEventListener('DOMContentLoaded', cb);
    }

    // 2) Carrega o CryptoJS
    function loadCryptoJS(cb) {
        if (typeof CryptoJS !== 'undefined') return cb();
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
        s.onload = cb;
        s.onerror = function(){ console.error('Falha ao carregar CryptoJS'); };
        document.head.appendChild(s);
    }

    // 3) Utilitários
    var utils = {
        // <<< reintroduzido >>>
        getURLParam: function(key) {
            var p = new URLSearchParams(window.location.search);
            return p.get(key) || '';
        },
        getUTMParams: function() {
            var p = new URLSearchParams(window.location.search);
            return {
                utm_source:   p.get('utm_source')   || '',
                utm_medium:   p.get('utm_medium')   || '',
                utm_campaign: p.get('utm_campaign') || '',
                utm_id:       p.get('utm_id')       || '',
                utm_term:     p.get('utm_term')     || '',
                utm_content:  p.get('utm_content')  || ''
            };
        },
        getFBCookies: function() {
            var p = new URLSearchParams(window.location.search),
                fbclid = p.get('fbclid'),
                fbc = '', fbp = '';

            if (fbclid) {
                fbc = 'fb.1.' + Math.floor(Date.now()/1000) + '.' + fbclid;
            } else {
                document.cookie.split('; ').forEach(function(c){
                    var kv = c.split('=');
                    if (kv[0]==='_fbc') fbc = kv[1];
                });
            }
            document.cookie.split('; ').forEach(function(c){
                var kv = c.split('=');
                if (kv[0]==='_fbp') fbp = kv[1];
            });
            return { fbc:fbc, fbp:fbp };
        },
        // **SUA** lógica de GeoData que funciona perfeitamente
        getGeoData: function(cb) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://ipapi.co/json/?key=Vp36YgwyV4FHt5L0Vzj5BnCXtmiED7ivUdPqHt0f6Nqbr7TEV6', true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState!==4) return;
                if (xhr.status===200) {
                    try {
                        var d = JSON.parse(xhr.responseText);
                        cb({
                            city:    d.city,
                            st:      d.region_code,
                            country: d.country_code,
                            zp:      d.postal,
                            ip:      d.ip
                        });
                    } catch(e) {
                        console.error('Erro ao parsear GeoData:', e);
                        cb({});
                    }
                } else {
                    console.error('Erro ao fetch GeoData:', xhr.status);
                    cb({});
                }
            };
            xhr.send();
        },
        hashData: function(str) {
            return str
                ? CryptoJS.SHA256(str.trim().toLowerCase()).toString()
                : '';
        }
    };

    // 4) Configura form + links
    function setupForm(geo) {
        console.log('GeoData carregado:', geo);
        var f = document.querySelector('form');
        if (!f) return console.error('Form não encontrado');

        // pega valores do form
        function vals() {
            return {
                name:  (f.querySelector('[name="name"]')  || {}).value||'',
                email: (f.querySelector('[name="email"]') || {}).value||'',
                doc:   (f.querySelector('[name="doc"]')   || {}).value||'',
                phone: (f.querySelector('[name="phone"]') || {}).value||''
            };
        }

        // montadora do JSONPX
        function updateHidden() {
            var u = utils.getUTMParams(),
                fb = utils.getFBCookies(),
                v = vals(),
                now = new Date(),
                ts  = Math.floor(now.getTime()/1000);

            var jsonpx = {
                data:[{
                    event_name:     "Lead",
                    event_time:     ts,
                    event_source_url: window.location.href,
                    action_source:  "website",
                    user_data:{
                        em:  utils.hashData(v.email),
                        ph:  utils.hashData(v.phone.replace(/\D/g,'')),
                        ct:  utils.hashData(geo.city)    || '',
                        st:  utils.hashData(geo.st)      || '',
                        zp:  utils.hashData(geo.zp)      || '',
                        country: utils.hashData(geo.country)||'',
                        client_ip_address: geo.ip||'',
                        client_user_agent: navigator.userAgent,
                        fbp: fb.fbp,
                        fbc: fb.fbc,
                        external_id: utils.hashData(geo.ip)
                    },
                    custom_data: Object.assign({
                        currency: "BRL",
                        content_type: "lead",
                        event_day: now.getDate(),
                        event_time_interval: now.toISOString()
                    }, u)
                }],
                test_event_code:""
            };

            var hf = document.getElementById('form-field-jsonpx');
            if (hf) {
                hf.value = JSON.stringify(jsonpx);
            } else {
                console.error('Campo oculto jsonpx não encontrado');
            }

            processPaymentLinks(u, geo);
        }

        // corrige todos os <a> de Hotmart e Greenn
        function processPaymentLinks(utm, geo) {
            var sel = 'a[href*="pay.hotmart.com"], a[href*="greenn.com.br"], a[href*="payfast.greenn.com.br"]';
            var slug = window.location.pathname.replace(/^\/|\/$/g,'');
            var ublk = [
                utm.utm_id,utm.utm_source,utm.utm_campaign,
                utm.utm_medium,utm.utm_content,utm.utm_term
            ].join('|');
            
            var xcod = [
            utils.getURLParam('mac_id')    
              || utils.getURLParam('gac_id')    
              || utils.getURLParam('tiktok_id'),
            utils.getURLParam('s_as_id'),
            utils.getURLParam('s_ad_id')
        ].join('|');

            document.querySelectorAll(sel).forEach(function(a){
                var href = a.getAttribute('href'),
                    sep  = href.indexOf('?')!==-1?'&':'?';

                var params;
                if (href.includes('hotmart.com')) {
                params = 'sck='+ublk+'&xcod='+xcod+'&src='+slug;
                } else {
                params = 'utm_source='+ublk+'&xcod='+xcod+'&src='+slug;
                }

                a.setAttribute('href', href + sep + params);
            });
        }

        // dispara em todo input
        Array.from(f.getElementsByTagName('input')).forEach(function(i){
            i.addEventListener('input', updateHidden);
        });

        // primeira chamada
        updateHidden();
    }

    // 5) Inicializa tudo
    onDOMReady(function(){
        loadCryptoJS(function(){
            utils.getGeoData(setupForm);
        });
    });

})();
</script>
