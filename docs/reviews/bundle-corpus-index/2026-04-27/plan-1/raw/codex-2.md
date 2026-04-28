Reading additional input from stdin...
2026-04-28T01:19:55.765935Z  WARN codex_core::plugins::startup_sync: startup remote plugin sync failed; will retry on next app-server start error=remote plugin sync request to https://chatgpt.com/backend-api/plugins/list failed with status 403 Forbidden: <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style global>body{font-family:Arial,Helvetica,sans-serif}.container{align-items:center;display:flex;flex-direction:column;gap:2rem;height:100%;justify-content:center;width:100%}@keyframes enlarge-appear{0%{opacity:0;transform:scale(75%) rotate(-90deg)}to{opacity:1;transform:scale(100%) rotate(0deg)}}.logo{color:#8e8ea0}.scale-appear{animation:enlarge-appear .4s ease-out}@media (min-width:768px){.scale-appear{height:48px;width:48px}}.data:empty{display:none}.data{border-radius:5px;color:#8e8ea0;text-align:center}@media (prefers-color-scheme:dark){body{background-color:#343541}.logo{color:#acacbe}}</style>
  <meta http-equiv="refresh" content="360"></head>
  <body>
    <div class="container">
      <div class="logo">
        <svg
          width="41"
          height="41"
          viewBox="0 0 41 41"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="2"
          class="scale-appear"
        >
          <path
            d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div class="data"><div class="main-wrapper" role="main"><div class="main-content"><noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript></div></div><script>(function(){window._cf_chl_opt = {cFPWv: 'g',cH: 'vlINHDNFJakQVLbfMO5HnPPCYbEC86mVFojr0E5ekUY-1777339195-1.2.1.1-jZG9.MINvYZlE48IKuEkciN2c1sCaYGUP5QlMG1PT9xeQGJvRemSNEF.xIrDs3Pt',cITimeS: '1777339195',cRay: '9f323dd57e8b2386',cTplB: '0',cTplC:1,cTplO:0,cTplV:5,cType: 'managed',cUPMDTk:"/backend-api/plugins/list?__cf_chl_tk=_qpVqz6QxGR13b.F9tFwEYML2QLFvmLmzGXXHXgbENM-1777339195-1.0.1.1-LkGtrQ_3V284BpU4sD7Ns31CnE07PqYujYQXxyJnhAM",cvId: '3',cZone: 'chatgpt.com',fa:"/backend-api/plugins/list?__cf_chl_f_tk=_qpVqz6QxGR13b.F9tFwEYML2QLFvmLmzGXXHXgbENM-1777339195-1.0.1.1-LkGtrQ_3V284BpU4sD7Ns31CnE07PqYujYQXxyJnhAM",md: 'NYcIvEklSyqhpE38oSar5wP92JJmuMMbDrVyUQe5Ntw-1777339195-1.2.1.1-wLyOVQY5xoaSwOZA17B4J.RAK0LosU.Rfu2.zHuHfYxV2gBV3qwc_mpqh5ACxSeXpf7l9WDN47oFLIjfvruc8G1F2Z08dve8BnDsgeetdgHEhGqgIAC5v_w1yYyMFuc4hmuGr4AG6fmWQ3kjwLvFaC2Sc3h4vCQjBhhaXjpGVndHq2UciyrYkHd8kf_8e9cGCPJO00XvbsTKLFI23PfNVopHEGx2pFCgS0Sg8gQJtPbCVFtfFrGKPBA89BPEeUQXKooOHpSv1NDlI6wXiPM7SAONCJfatKIOHsbFs8RZFOQBlXeD6MB6oS65tLjRElaQY7mgrf8NZnElma07S0c71DeR5ZX5fJ5v1IZ4E5M7inFsrI6u9Q2SFg888peYDTWVdsw2Qk0A2UIL4VPFmV13TEGdWiGmcAHZrZAh2x7RwbXbUf5oUb9xNqD1oAtfQ1yo6zF_J8ZxtQIJvp2x_WxLdZEIptTKqefZxQCKkSKaiqngMXAA880FC6phpOBP0r.snp8KPbRMuSMjxzKiuXuIkvCxuatpgxyGXGZu5JljmtYE6_fhs91.sINT9y878AwuE5yUV0Om5sISCei.QIi7gPzkICT1sc2wNp8_oNoy7vzPZUrYjN.rE._Z9QxQuM7lGAVe8xZYShfFIY3cDT3gGwdovZY7iYoFkQ6zMem5AbTt7L8hSCCTLE997Rs8sg4T3_G.vyVXbW7Qq22AQTXpD6o7Qp1KElIDbk767vu85cwcoei4HinEcSExA_e20dQRbmM.nci2CgdQ123UNbBQ9.8yG6SFcwOoG3JgIfd4XGLyUgZeQxRFbiPH0u203OhzM4SjtuYPO2qFudXR1pcGmZ9mTEqbGW3N.g_WXHsUd7ybXJH745vHhtAn2c691wiKo3NJRqzZ7PfiLTDStKmnuhIRvKkDU74nGn2A9.3bFtmfs57Sl0efFlAk1BVssaBSjf_dTwIuulklJGiHJw.cGBZnxqDqo9f.1prn05uyruBC7vL.7aDDiCaSfGF_lHVh1byjIDbCKQrPgSMNBnxS_8W0PDVIkzlC9ah2an6.H.ccUyM9mlMIDST8M4q5rs73',mdrd: '3EiRfelDi4AR25q75WIPK3JeK3gP21z5xccAR2OMMHo-1777339195-1.2.1.1-A1UGqaQ2fXZ5gPKoOKOHvFr8kdIGW19bGY9kfcf5mgQ.RPMdty2CloLrmotuwtpSgC_ykJpPrKAdFu.g5vgkSMDqehhXaw6G1iCa6TJIkvfI6CyTXga9.K7ZbLYy6mWL9ZNHDCKqo67eOBLGdByU1LUs9g_KyIWtqemCQkC2crvXcLsISWzj8EiIGb4JGIRr3i7RoIXAGhNiadiQFLznsaKh0I08Y15OUySOCcLXxcLk8ppGxM9TtQlsXI4SGfVI6kf5Pd3CcttXkFSikYwoK9B_M4vXt2nFFigwvn65TCgNTe51R4zp9_htGw87QFcy.uLW_igA.3oAYrua.GvHU4M9qB_.vHCu197bqQmedqdEMckWcZib6YxRt1HkUFXp_ZDMEAysaIvqRXsUGR4MpRVtBgepZAEnpR_vooux0woR0KtcOpbiGf9q_9WfiHlHAvRhDEy4xcsu14jX70JWQoSeOGkW52_zgECcUlQupRaPN920wWzIAbgWq23AH7aMKYCsj72W2A.4Er24QOx3ZSaus8qkgZtbkY_w8SfL9pRBxG_mn7UznuNfeyQuhUx5MyERdDrsBILToid61f6F7KmyRsLsygwnuag_8lHCXRdVDOEOJPpDx.NY0H4DVPhqYalmZxdP0GqHrv2.Bi46GH8cWCZ6l7U9NcWqnv4aOYQDKuI7zweQ.mC1UdlKvEtV5OO.C850odZNHUR10YS5ASS8LEpIo.wUbC7h066fogFE4JfNVZtqopJlkuvt7dwKzuWxV3rt6ouTFfDArk9XgWEE7n_buTuVMRJm_ypnZrB8mVLsT7L5_ayQM4NB0XMSB2tNhMG_YHFAxu5VchVZ0XSMo_R.LVXOREymqFvEfLCXqzcxq9F9TXbJyXa19reeE7wfZyFvzke1AYlUXOPzOAbHt.9Ni_1k5L9CrJqO5WafsLZ36iRAx5h.L33SCGXJ0Gszn96O25UPfFYiBNl5tYIJ4kizcvrVgdy6hb0DmmukfrDgSCPvy8AJTgu1wXBFePj79oEiPwL8vZ7phDApyHs.EL6.qy5.Z4d3fHvpjfszUGM4qiaEqEFa8Yhcit54BXh1PR5RwglLpScMC4FEx0USwJqpAla4UVIpV9PW_hoIsobT.ujoaCBjsfoI82C6nPoyAnb0SnJw.NcFaRdC9aljMzksJVdOxJ2Ow_rX6C0sirxr.H.ZcY_D1tI9XJvcI8eIeH3YqtizORz.RLD6z79JYBT1CIyBeGyegauD5x8PLyDPZ_1pxliG7Jx2Dix9O2eqZTsy53Ko1jyr1_T2d4fZJiJOOdWxf_lKEKdDum05nvYUO.cDfEeJf82ejl.oztGHDMiONpSrL8QVfxxVDKjrJwOyVhKB97to.M0FK4_daqL.w7XFFEF3gaNP5vlzNRUhu_0w4DtrCj4ADXN8g2NVpg2cJ.NN8R6wqjH5QzGlCRKZrmw0v3PbNy62uyy67GVmK1BaVKLxXbxe_4iveNMiK0k07oZbr7OsrFGnBuuhKSF_hzOiUwv5icl5_Czjz5msXrrXubk1M8ug03OZx.qMApvEqQ_XRdRCvBHzy2SLVpEGSadympyuUodqrJqfdwc06hS3EOTaJV.nj0hPMHVaIBcsfRooBa5bveIfOLq2cXE4uWRFraIHi4rOZTkORd9J6EmqO9vuyP2b3P0CJzElVdyFPPaIwXH4Ki.NyfYITRrcXFxnNeaReSUX4fSPehPZpGqk117st6U7clM.lvmTveHkAs43ZYd7JCs1af_QNmXOuZPERWFUBhS2Zcng4uWyUstmscFZ9tnOeFn2tXDFMhLAOrBVFPxWsP88xTk4ClCe4x.cRIcuSBYOIPK39d6FXEnU7uk5LS98B6rLqLbCQmz9U9cijJgk9z5L9ar5gmaqHXRHWMSlTweOGo.nmO7OYMcyvpvASO8I7M90bNUaosmw0_Ep8rb1wf9ilVMKprtYqhhRFjdOykJyhn0WxKL4NnajQD2oOu01HBZ0nkUmrwtFe4L9kHkNN7KTv3txLoQhs2FkoFxyv.N5ZJEfx6MZ2BtzvWoOjDzer9VoFax5EaH0mC6SzUPALaniRfWxQdd3ZVz7Aw6E7tkfirGbOakiBYYT01vuEggBO4Ee5iBYTd9H72BBtC7o8brgPLGTpXtmxmsExHei.0MIGYzHqVXhiDdY13HSPW.3IBLNwyWHX9.jTD0ToBHhW74xGmzWHrWQPDuECKq63KYvyqB9BzKY9DRXqAOJ16CV6A1P7Q',};var a = document.createElement('script');a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=9f323dd57e8b2386';window._cf_chl_opt.cOgUHash = location.hash === '' && location.href.indexOf('#') !== -1 ? '#' : location.hash;window._cf_chl_opt.cOgUQuery = location.search === '' && location.href.slice(0, location.href.length - window._cf_chl_opt.cOgUHash.length).indexOf('?') !== -1 ? '?' : location.search;if (window.history && window.history.replaceState) {var ogU = location.pathname + window._cf_chl_opt.cOgUQuery + window._cf_chl_opt.cOgUHash;history.replaceState(null, null,"/backend-api/plugins/list?__cf_chl_rt_tk=_qpVqz6QxGR13b.F9tFwEYML2QLFvmLmzGXXHXgbENM-1777339195-1.0.1.1-LkGtrQ_3V284BpU4sD7Ns31CnE07PqYujYQXxyJnhAM"+ window._cf_chl_opt.cOgUHash);a.onload = function() {history.replaceState(null, null, ogU);}}document.getElementsByTagName('head')[0].appendChild(a);}());</script></div>
    </div>
  </body>
</html>
System.Management.Automation.RemoteException
2026-04-28T01:19:55.773696Z  WARN codex_core::plugins::manager: failed to warm featured plugin ids cache error=remote plugin sync request to https://chatgpt.com/backend-api/plugins/featured failed with status 403 Forbidden: <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style global>body{font-family:Arial,Helvetica,sans-serif}.container{align-items:center;display:flex;flex-direction:column;gap:2rem;height:100%;justify-content:center;width:100%}@keyframes enlarge-appear{0%{opacity:0;transform:scale(75%) rotate(-90deg)}to{opacity:1;transform:scale(100%) rotate(0deg)}}.logo{color:#8e8ea0}.scale-appear{animation:enlarge-appear .4s ease-out}@media (min-width:768px){.scale-appear{height:48px;width:48px}}.data:empty{display:none}.data{border-radius:5px;color:#8e8ea0;text-align:center}@media (prefers-color-scheme:dark){body{background-color:#343541}.logo{color:#acacbe}}</style>
  <meta http-equiv="refresh" content="360"></head>
  <body>
    <div class="container">
      <div class="logo">
        <svg
          width="41"
          height="41"
          viewBox="0 0 41 41"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="2"
          class="scale-appear"
        >
          <path
            d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div class="data"><div class="main-wrapper" role="main"><div class="main-content"><noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript></div></div><script>(function(){window._cf_chl_opt = {cFPWv: 'g',cH: 'OYCtszQptioXV_NMhszM.7n4dHshyyLdzzWT5tHuSDw-1777339195-1.2.1.1-kHG7hIT6u4z_KhbKXS_tOkBiW8QvvCV3bfZvmGpKYvglqGaljJ__gCVEcSuxgtbD',cITimeS: '1777339195',cRay: '9f323dd57b0c552b',cTplB: '0',cTplC:1,cTplO:0,cTplV:5,cType: 'managed',cUPMDTk:"/backend-api/plugins/featured?platform=codex&__cf_chl_tk=d11VPlaF0z5pTJo_RkqRE1.zrkxziH4QhCGhKqwy4Ig-1777339195-1.0.1.1-lwwGGfml8OLb3i5HusxEo_t0YnTWxftlt4v566Y5W68",cvId: '3',cZone: 'chatgpt.com',fa:"/backend-api/plugins/featured?platform=codex&__cf_chl_f_tk=d11VPlaF0z5pTJo_RkqRE1.zrkxziH4QhCGhKqwy4Ig-1777339195-1.0.1.1-lwwGGfml8OLb3i5HusxEo_t0YnTWxftlt4v566Y5W68",md: 'yMwyNsFEFLyTtcSHpuHFKrfDe3rXlIsscYx6Pc4chsM-1777339195-1.2.1.1-IWFMosu9Bn397QVvexUzeKLyK45wUBk0HlNMuICm3Vg.Bac5wIS0i9xd_8BFsA4NpYWkNrwc58tjA.94DCkpXToRQkLGnjDRwrOsYoriBJMh5T5sbyFYJha_adxw0TlhdcdV0NbhtDA6VqWsYw2ZDLVbaaHWnh4gN0YCiBEXKMotwHFr2c8DGf9p8wshVKKwnjHGrMlzD6UhoqZO7FaTO4klZk_fIOeHjgTDIo7HaZyhLfr5JqguFmxxCpyUe8CbvT..kld9IWOvF0_IQ7fYbI.LYSgznhmeRwlfSJr9eGh_oNC2q34U_C9PqyEfPbxbyobPt_1DMSzUU4cGKdPnAbriIW6WQfvaypEUIBLDmT7qfGkjNWpfeirwWR53CN9gENA43YHYnxxZBVB9JnCIA1e5MzHOLQRGKwyCtZySyxALDqx3NbFHRTX6_N2V2j4gzNIecLk7T7SpUoXEk_pid67_NogM.xrLAbGAOf3QU55EaNsNwqXokNNiF7T7xyUagjuFSaRKLa.THgqBwW6H8An3rasL6FztykNYudtOxQZtC9dfvi5oClRFHqk7tJjbFxZ6_EhyK3TJXqfJLydw1zldjX1GY0p3Hr4B5TWD41gCANv1GdgLd2AmfFS7jUfcPl_axVVrEHNj_G5VSt_Oi2c0pU8uM8uZfOp9eLIqEdZJAaGpXk7kjChZnCr2w41VJ_GxFbXeBcOb8ZPVb9EkPl7pTrOEuYICvfix7raLkBSVfI1Hep8tHxcOG6JNz11RP5tWmjUTBR9tpo3NJVawG8TA1D7am_qTdXO55g9kJzbhOSGIOaBIjtEaILIVTXU9kSIj3sb7T1fFr6fVqcm776su_OfkV3XQQH1MR_YGyV1Oj8ssFBPeuSlbCN3fUjwbACvOseZxmRB6RNO3GdUeH.zd.DcVwyIs92CmmnXXGWUi3BrAmVNWDfygwN0RX2NZBeP1H52MBG8ZI0RECWKFQ.zGUexS3tXLZ47VFLib2d_wuExDzr3qgyg1NU6ABY0TPJv6e0OY2EmaHfaAZhjqh06N83OaHok.bKo2jfzieiP3NNy8g9kwgZYZasuSWbE7',mdrd: '8SUXJbC1phQlXUXa7uv23Y8DWUO0jDTWN7ByfZqlhD0-1777339195-1.2.1.1-jyUPDlxMOWS2sTxCS1PlN2T1FLYZFAWzU098rM0BUo.1VISaJMx5iMJXk8fFRkTgFASHFP17.PIj7guWDGQp5Cc3iAOCIiNIpJ5Kw7wmU_8G3MzSrSdFv7TX13zMHbD8pYxYLMDX7FG32lzBYp_Lqt.6MIX7uLZk8gpa9WueZWcr5ZXQ28ryqU6YTEhXX4DPFMW.YzPcsbzdrzmZlinFTCpi6MUuz5dVelQ_8PtnnZ0uVx0DoWVB2v4cvImrzrHxcSO5lWSAnu846ARXUzJdmoQwtSPnIZe8Y8Ln7JiRXVxr_4a3Z81lcSv4kS_CoBgNpTTT2AHn_6K23jYQWGtDhaXQsXq4khaNPi4DCTY4pPhjb_UVXBFN5VOgsyni3CFg0n096syhGbT.vGt0rU.5bnD8AzIt9EUIKvkLlAsbbXAOBAzHEeDnJrPSAw3XJlnwMlpzf2yo4_1L8IhwEoXejTA0MaaK.EO6y6jF_RUZD2cb5pKONY5Z54P1uuaN3YK4ozl2nMFpdeUFN5cTyUF5Azgw6XS6pDFkb8xj.P4tq3jLCfw3csuABuLKFVHhjm_ApLPz__wkF6VUDgn4IyKwFhQq4lh3vr4xX_Wt45BrXDDE2m3S.3p5hwmBfY67TUb8ARjzdhaf5b9KPEOPAdB3YTqOojKhVej8Q81lqddhy1lYHk_OKye2jmBZSHqK8STD1gYN21eb5.Fw712cp5jqtwzouhB1EwixWqpcKLkq16sAIbKSFx4NgZU_0PAvdTo2Tv4.8xZXuJbh3UjtLNvhiM2arWrz04oUrMGWDeXzd8xtlzBC9Xb6TL7nUCyWrPMqfqIINLSU9hFcxsSS.2EGb8EZlMvvDtnX0_WD.MzsKgQ46NrUbvg2wIkmCNjxfcZacNk1q4GqPVkXR8i1RgDVATXNz_H3LWOyMHnuvwDtw4dGoFVcUwywTQOp2jUFkFP5ZfRUEQDPoaBqZO0Vf4V2VSCYvHk8xfgknSXGkbXm_suW3pcuOYc_Nv.pmyKsAzkrNMkObXybyD6I8HqbEGJCxuQkmySeAR2MBRvmHph2ywNk7iuP5ERq3CwlRg80N.GKUiLXMWPyTM3E38jRnxZzBg_9ghc22hExU9bFNT280aPpr1cj2t1EUvSWm3SLr_1Q5TpnOWGelFWSMuWVuQhZ5HPiURbgq7ich1y.3Es.EJ4rLJ6hxQyU0jkqA51EtY5iVGXPnNjAXuZwbqJgsdbu3hAseLbnfkOnpiSkkrnmLIfvAiH7KVXnQlf0I9iXpAQh8jGa5W90jM2Zt65hCJIBA9uEmoMPzFQcG40fBxw6_qN46dm13hqD80ME7_V4_iuPbH8B18wyqaD5FXVLGn9JTm2AcDIGoMWN5umfxRKpU4aHaBTZPuIF8dVd6pUF7ypau6lTjCM17sBAE12G40EyGMeOlAm8.TSSoSoWPqTuIwuqbf0kYdP9epWZnwFQGEJHDl09Jx37y36IWmJDseCh_ELG1yQXjbZcPsciaxugBMIkESkUaiAHNKz4tKG_.tyWnyDYwqVAI2LKRZphP2NRbRewqJZoZquaQldtYIJIOT7Ap.VwZtquxjznjneimgCkWW4.cV8COcK4ZqTB88UGnMRu8QpKbuFqBuj_iHhSt8TKqwyl1Z2AcXrxN_kPoKskJSNKazeWddYWvw9Kg3dYmkneFEu4RE65FOYa4YEK5c722FWMnm0Zx6dDcGrJF5mj81rHZdybYqoWILlGvf6KcCciOmeNtbu.hnZablbQM1XPhLDy1k4eseUrvQHP1iJ.6B1uwrkf8238KAp7QYHq9pirUQ6Z9XT3hfgtLI3sxvfnv2hIz.kcmJVvioKqyqKqbtC49nEjZee96VCYwAurH.iiRILyM0oW8MDYPmLvxnM8smuaeOykVhFpXyZxb_LjfbsFyxPAmVEVlQIED8N47dG71tBTlUXPvDEJUtUPbfr0zOFf07N9OnvUk.79zssnZ.B2jLT1p1FZIgTKK476awapr6Wy2zsGjfGmFn7S1f783oN.zmkrq9bqhDsDERdPA4Z6i6kK2kVjjKIpC5ZuYeaIIGFW6aGvbnHvVWXHtFvUNLB2iXldR1IPrzxbx2Bq.ofmI9mWQcQUcm_BbtosoP9aJ2QdtulP9xlsqkZXx.aCcEvjRQ3omoZjFBKBKro8jKAuuKlWTB6XiZIoHgEav28BWtiyTA0H10QmbxPvlV.W9SCy6hFj.5RCMVTFPjPi',};var a = document.createElement('script');a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=9f323dd57b0c552b';window._cf_chl_opt.cOgUHash = location.hash === '' && location.href.indexOf('#') !== -1 ? '#' : location.hash;window._cf_chl_opt.cOgUQuery = location.search === '' && location.href.slice(0, location.href.length - window._cf_chl_opt.cOgUHash.length).indexOf('?') !== -1 ? '?' : location.search;if (window.history && window.history.replaceState) {var ogU = location.pathname + window._cf_chl_opt.cOgUQuery + window._cf_chl_opt.cOgUHash;history.replaceState(null, null,"/backend-api/plugins/featured?platform=codex&__cf_chl_rt_tk=d11VPlaF0z5pTJo_RkqRE1.zrkxziH4QhCGhKqwy4Ig-1777339195-1.0.1.1-lwwGGfml8OLb3i5HusxEo_t0YnTWxftlt4v566Y5W68"+ window._cf_chl_opt.cOgUHash);a.onload = function() {history.replaceState(null, null, ogU);}}document.getElementsByTagName('head')[0].appendChild(a);}());</script></div>
    </div>
  </body>
</html>
System.Management.Automation.RemoteException
2026-04-28T01:19:55.846099Z  WARN codex_core::shell_snapshot: Failed to create shell snapshot for powershell: Shell snapshot not supported yet for PowerShell
OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\38909\Documents\github\civ-engine
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: xhigh
reasoning summaries: none
session id: 019dd1ab-e1c0-7493-b667-e37c88586b77
--------
user
You are an independent senior implementation-plan reviewer for civ-engine. Review the Spec 7 plan for execution risk, TDD quality, type/API correctness, docs discipline, and hidden scope drift. Focus especially on whether tests would catch the important behavior, whether code snippets are internally consistent TypeScript, whether commands have expected outputs, whether the single-commit direct-to-main workflow follows AGENTS.md, and whether any accepted-design requirement lacks a concrete implementation step. Do not modify files. Return real findings only with severity and fix guidance. If the plan is ready to implement, say ACCEPT.
System.Management.Automation.RemoteException
<stdin>
diff --git a/docs/design/2026-04-27-bundle-corpus-index-design.md b/docs/design/2026-04-27-bundle-corpus-index-design.md
new file mode 100644
index 0000000..c287506
--- /dev/null
+++ b/docs/design/2026-04-27-bundle-corpus-index-design.md
@@ -0,0 +1,518 @@
+# Bundle Search / Corpus Index - Design Spec
+
+**Status:** Accepted v4 (2026-04-27 project-local date). Fresh Codex brainstorm completed before drafting. Design iteration 1 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-1/` for contract/API precision issues. Design iteration 2 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-2/` for the replay-horizon name, root-key encoding, attachment MIME query semantics, manifest-embedded attachment caveat, and error-detail shape. Design iteration 3 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-3/` for missing-key wording on the wrong API surface and non-canonical `recordedAt` handling. Design iteration 4 accepted this version under `docs/reviews/bundle-corpus-index/2026-04-27/design-4/`.
+
+**Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 7). Builds on Session Recording / Replay (Spec 1), Synthetic Playtest Harness (Spec 3), and Behavioral Metrics over Corpus (Spec 8). v1 provides a disk-backed corpus/index that discovers closed FileSink bundle directories, lists and filters them from `manifest.json` metadata, and yields full `SessionBundle`s lazily for `runMetrics`.
+
+**Author:** civ-engine team
+
+**Related primitives:** `FileSink`, `SessionSource`, `SessionBundle`, `SessionMetadata`, `SessionRecordingError`, `runMetrics`, `SessionReplayer`.
+
+## 1. Goals
+
+This spec defines a first-class **bundle corpus index** that:
+
+- Opens a local filesystem corpus root and discovers FileSink bundle directories by finding `manifest.json`.
+- Builds a small in-memory index from each bundle's manifest: `schemaVersion`, `SessionMetadata`, attachment descriptors, and derived manifest-only fields.
+- Lists and filters corpus entries without reading JSONL streams, snapshots, sidecar bytes, commands, ticks, events, or markers.
+- Provides deterministic iteration order for both metadata entries and full bundle iteration.
+- Implements `Iterable<SessionBundle>` semantics so existing `runMetrics(bundles, metrics)` workflows work unchanged against disk-resident corpora.
+- Exposes explicit on-demand escape hatches (`entry.openSource()`, `entry.loadBundle()`) for consumers that need replayer/content access.
+- Defines corpus behavior for finalized, immutable-on-disk bundle directories. Callers construct a new corpus after generation, deletion, or mutation.
+
+The deliverable is an additive API surface. Existing `FileSink`, `SessionRecorder`, `SessionReplayer`, and `runMetrics` behavior remains unchanged.
+
+## 2. Non-Goals
+
+- **Content indexing in v1.** Queries over `commands.jsonl`, `ticks.jsonl`, events, markers, snapshots, sidecar attachment bytes, or metric outputs are out of scope. v1 query predicates are manifest-derived only. Explicit dataUrl attachments can still place bytes inside `manifest.json`; v1 reads those only as part of manifest parsing, not as a separate content index.
+- **Metric-result indexing.** "Find bundles with high decision-point variance" requires either a game-defined metric pass or a future derived-summary index. v1 can feed matching bundles into `runMetrics`, but it does not persist metric summaries.
+- **Persistent `corpus-index.json`.** The index is rebuilt from manifests at open time. A persisted cache creates invalidation, write coordination, and stale-index failure modes before the corpus is large enough to justify it.
+- **Async / remote storage APIs.** v1 is synchronous and local-disk-only, matching FileSink and the engine's current synchronous session stack. A future `AsyncBundleCorpus` or `runMetricsAsync` can land when there is a real remote/backend storage pressure.
+- **UI or viewer.** Standalone bundle viewer work remains Spec 4. This spec is a library/query surface only.
+- **Retention, compaction, delete, archive, or mutation policies.** v1 reads finalized corpora; it does not mutate bundle directories.
+- **Schema migration.** v1 accepts `SESSION_BUNDLE_SCHEMA_VERSION` only. Future bundle schema versions need an explicit migration/loading story.
+- **Live writer detection.** v1 does not try to detect or exclude active `SessionRecorder` / `FileSink` writers. Callers are responsible for building a corpus only after writers close.
+
+## 3. Background
+
+Spec 3 can generate many `SessionBundle`s via `runSynthPlaytest`. Spec 8 can reduce an `Iterable<SessionBundle>` through `runMetrics`. The missing piece is a durable corpus source: today a caller either keeps bundles in memory or manually walks directories and calls `new FileSink(dir).toBundle()` for each one.
+
+FileSink already defines the disk format:
+
+```text
+<bundleDir>/
+  manifest.json
+  ticks.jsonl
+  commands.jsonl
+  executions.jsonl
+  failures.jsonl
+  markers.jsonl
+  snapshots/<tick>.json
+  attachments/<id>.<ext>
+```
+
+`manifest.json` is the natural v1 index unit because it contains `schemaVersion`, `metadata`, and attachments. It is atomically rewritten at `open()`, successful snapshot writes, and `close()`. Reading manifests is cheap and does not force loading streams, snapshots, or sidecar bytes. FileSink defaults to sidecar attachments, but explicit dataUrl attachments embed bytes in the manifest and therefore increase manifest parse cost.
+
+The current `SessionReplayer.fromSource(source)` and `FileSink.toBundle()` path eagerly materializes a full bundle. This spec does not change that. Instead, it gives callers an efficient manifest-only listing/filtering layer and keeps full bundle loading explicit and per-entry.
+
+The important boundary is that the corpus indexes a closed/frozen file tree. A construction-time manifest index is deterministic only if bundle directories do not keep changing underneath it. `metadata.incomplete` remains a manifest fact about abnormal termination, not a reliable signal that a writer is still active.
+
+## 4. Architecture Overview
+
+New module: `src/bundle-corpus.ts`.
+
+| Component | Responsibility |
+| --- | --- |
+| `BundleCorpus` | Opens a corpus root, scans for bundle manifests, stores a deterministic in-memory entry index, exposes `entries(query?)`, `bundles(query?)`, `get(key)`, `openSource(key)`, `loadBundle(key)`, and `[Symbol.iterator]`. |
+| `BundleCorpusEntry` | Immutable metadata view for one bundle directory plus explicit `openSource()` and `loadBundle()` methods. |
+| `BundleQuery` | Manifest-only filters over `SessionMetadata` and derived fields. |
+| `CorpusIndexError` | `SessionRecordingError` subclass thrown for malformed manifests, unsupported schema versions, duplicate discovered keys, invalid query ranges, or missing keys when strict behavior is expected. |
+
+Data flow:
+
+```text
+BundleCorpus(root)
+  -> scan for manifest.json
+  -> parse/validate manifest metadata
+  -> derive index fields
+  -> sort entries by canonical corpus order
+
+entries(query)
+  -> validate query
+  -> filter in-memory manifest entries only
+  -> return stable ordered entry array
+
+bundles(query) / [Symbol.iterator]
+  -> entries(query)
+  -> for each entry: entry.loadBundle()
+       -> new FileSink(entry.dir).toBundle()
+       -> yields SessionBundle
+
+runMetrics(corpus.bundles({ sourceKind: 'synthetic', incomplete: false }), metrics)
+  -> unchanged Spec 8 reducer
+```
+
+## 5. API + Types
+
+### 5.1 Construction
+
+```ts
+export type BundleCorpusScanDepth = 'root' | 'children' | 'all';
+
+export interface BundleCorpusOptions {
+  /**
+   * How far discovery descends from rootDir. Default 'all'.
+   * 'root' checks only rootDir.
+   * 'children' checks rootDir and immediate child directories.
+   * 'all' recursively checks rootDir and all non-symlink descendant directories.
+   */
+  scanDepth?: BundleCorpusScanDepth;
+  /**
+   * If false (default), the first invalid manifest aborts construction with CorpusIndexError.
+   * If true, invalid manifests are recorded in corpus.invalidEntries and omitted from entries().
+   */
+  skipInvalid?: boolean;
+}
+
+export class BundleCorpus implements Iterable<SessionBundle> {
+  constructor(rootDir: string, options?: BundleCorpusOptions);
+  readonly rootDir: string;
+  readonly invalidEntries: readonly InvalidCorpusEntry[];
+  entries(query?: BundleQuery): readonly BundleCorpusEntry[];
+  bundles(query?: BundleQuery): IterableIterator<SessionBundle>;
+  get(key: string): BundleCorpusEntry | undefined;
+  openSource(key: string): SessionSource;
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug>;
+  [Symbol.iterator](): IterableIterator<SessionBundle>;
+}
+```
+
+The constructor performs manifest discovery synchronously. Construction is the only manifest scan. `entries()` and `bundles()` operate over that in-memory entry set; callers who want to see newly written bundles construct a new `BundleCorpus`.
+
+`openSource(key)` and `loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'` when the key is not present. `get(key)` is the non-throwing lookup.
+
+The `loadBundle` generics mirror `SessionBundle`'s static type parameters. They are caller assertions, just like passing a typed bundle into replay/metric helpers: `BundleCorpus` validates the FileSink manifest/schema and materializes bytes through `FileSink`, but it does not prove game-specific event, command, or debug payload schemas at runtime.
+
+### 5.2 Entries
+
+```ts
+export interface BundleCorpusEntry {
+  readonly key: string;
+  readonly dir: string;
+  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  readonly metadata: Readonly<SessionMetadata>;
+  readonly attachmentCount: number;
+  readonly attachmentBytes: number;
+  readonly attachmentMimes: readonly string[];
+  readonly hasFailures: boolean;
+  readonly failedTickCount: number;
+  readonly materializedEndTick: number;
+  openSource(): SessionSource;
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
+}
+```
+
+`key` is the corpus-root-relative bundle directory path with `/` separators. If `rootDir` itself is a bundle, its key is exactly `'.'`. Descendant bundle keys never start with `./`; for example, `rootDir/a/b/manifest.json` yields `a/b`. `key` is the primary identity because `metadata.sessionId` can collide when bundles are copied or duplicated. `dir` is the absolute resolved directory path used by `FileSink`.
+
+`materializedEndTick` is `metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick`. It is the manifest's incomplete-aware upper bound for persisted bundle content, not a guarantee that `SessionReplayer.openAt(materializedEndTick)` will succeed. Replay can still fail at or after `metadata.failedTicks`, when command payloads are missing, or when full bundle integrity checks fail. `SessionReplayer` remains the authority for actual replayability.
+
+`metadata` is exposed as a frozen defensive copy. The implementation also copies and freezes `metadata.failedTicks` when present, then freezes the entry object. Callers cannot mutate the corpus index by mutating a returned entry.
+
+### 5.3 Query
+
+```ts
+export type OneOrMany<T> = T | readonly T[];
+
+export interface NumberRange {
+  min?: number;
+  max?: number;
+}
+
+export interface IsoTimeRange {
+  from?: string;
+  to?: string;
+}
+
+export interface BundleQuery {
+  key?: string | RegExp;
+  sessionId?: OneOrMany<string>;
+  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
+  sourceLabel?: OneOrMany<string>;
+  engineVersion?: OneOrMany<string>;
+  nodeVersion?: OneOrMany<string>;
+  incomplete?: boolean;
+  durationTicks?: NumberRange;
+  startTick?: NumberRange;
+  endTick?: NumberRange;
+  persistedEndTick?: NumberRange;
+  materializedEndTick?: NumberRange;
+  failedTickCount?: NumberRange;
+  policySeed?: number | NumberRange;
+  recordedAt?: IsoTimeRange;
+  attachmentMime?: OneOrMany<string>;
+}
+```
+
+All query fields are ANDed. `OneOrMany` scalar fields match if the entry value equals any requested value. Ranges are inclusive. A range with `min > max`, non-finite numeric bounds, or a non-integer tick bound throws `CorpusIndexError` with `details.code === 'query_invalid'`.
+
+Optional manifest fields (`sourceLabel`, `policySeed`) match only when the entry has a defined value. A `policySeed` filter therefore selects seeded synthetic bundles and excludes non-synthetic bundles whose metadata has no seed.
+
+`attachmentMime` matches if any MIME in `entry.attachmentMimes` equals any requested MIME. It is an any-match filter, not an exact-set or all-attachments filter.
+
+`endTick`, `persistedEndTick`, and `materializedEndTick` are all exposed because they are distinct manifest/debugging facts. For "has persisted content through tick X" queries, use `materializedEndTick`; raw `endTick` can overstate the persisted range for finalized incomplete bundles. For actual replay, use `SessionReplayer.openAt()` and let it enforce failure and content-integrity constraints.
+
+`recordedAt` filters use lexical comparison over normalized UTC ISO strings. Query bounds must be UTC ISO-8601 strings that round-trip through `new Date(value).toISOString()` and end in `Z`; any other form throws `CorpusIndexError` with `details.code === 'query_invalid'`. Current FileSink writers already emit this form.
+
+`RegExp` on `key` is local-process-only convenience. Queries are not JSON-serialized in v1.
+
+No function predicate is part of `BundleQuery`. Callers who need arbitrary conditions can use normal JavaScript on the returned array:
+
+```ts
+const longSynthetic = corpus.entries({ sourceKind: 'synthetic' })
+  .filter((entry) => entry.metadata.durationTicks > 1000);
+```
+
+This keeps the engine API small and makes the manifest-only boundary obvious.
+
+### 5.4 Errors
+
+```ts
+export type CorpusIndexErrorCode =
+  | 'root_missing'
+  | 'manifest_parse'
+  | 'manifest_invalid'
+  | 'schema_unsupported'
+  | 'duplicate_key'
+  | 'query_invalid'
+  | 'entry_missing';
+
+export interface CorpusIndexErrorDetails {
+  readonly [key: string]: JsonValue;
+  readonly code: CorpusIndexErrorCode;
+  readonly path?: string;
+  readonly key?: string;
+  readonly message?: string;
+}
+
+export class CorpusIndexError extends SessionRecordingError {
+  override readonly details: CorpusIndexErrorDetails;
+}
+
+export interface InvalidCorpusEntry {
+  readonly path: string;
+  readonly error: CorpusIndexError;
+}
+```
+
+Default construction is strict: invalid manifests throw. With `skipInvalid: true`, invalid manifests are collected in `invalidEntries`, omitted from `entries()`, and do not affect iteration. Full bundle load failures from malformed JSONL or missing snapshots are not swallowed; they surface when `loadBundle()` or `bundles()` reaches that entry. Sidecar-byte integrity is different: `FileSink.toBundle()` does not read sidecar payloads, so missing sidecar bytes surface only when a caller dereferences them through `SessionSource.readSidecar(id)` or equivalent source-level access.
+
+`details.code` is the public discriminator, following the existing session-recording error discipline. `details.path`, `details.key`, and other fields are JSON-shaped information that can be logged or serialized without carrying raw filesystem handles or exception objects.
+
+## 6. Lifecycle / Contracts
+
+`BundleCorpus` is a snapshot of a closed/frozen corpus at construction time. It does not watch the filesystem. It also does not copy bundle streams or snapshots into memory during construction. This is intentional: deterministic analysis and CI should operate over a stable set of files. Callers create a new corpus object after generating, deleting, or mutating bundles.
+
+Active writers are unsupported in v1. A bundle directory being written by `SessionRecorder` or `FileSink` can have a manifest that is atomically readable while JSONL streams and snapshots are still changing. `BundleCorpus` does not detect that state and does not guarantee consistent `entries()` / `loadBundle()` behavior for it. Generators should close sinks before constructing the corpus.
+
+Construction contract:
+
+1. Resolve `rootDir` to an absolute directory path.
+2. If root does not exist or is not a directory, throw `CorpusIndexError` with `details.code === 'root_missing'`.
+3. Discover `manifest.json` files according to `scanDepth`.
+4. Do not follow symlinks or Windows junctions during discovery. Directory symlinks are skipped.
+5. Stop descending into a directory once it is identified as a bundle directory by a direct `manifest.json`.
+6. Parse each manifest as JSON.
+7. Validate `schemaVersion === SESSION_BUNDLE_SCHEMA_VERSION`, `metadata` shape, `metadata.recordedAt` normalized UTC `Z` form, and `attachments` array shape. Non-canonical `recordedAt` values are `manifest_invalid` because canonical ordering and time filters depend on lexical UTC ISO comparison.
+8. Derive manifest-only fields.
+9. Sort entries in canonical order.
+
+`scanDepth` semantics:
+
+- `'root'`: check only `rootDir` itself. Use this when the root is a single bundle directory.
+- `'children'`: check `rootDir` and its immediate non-symlink child directories. Use this for a flat corpus where each child is one bundle.
+- `'all'`: recursively check `rootDir` and all non-symlink descendants. This is the default for nested corpus trees.
+
+Discovery should not descend into a directory after it has found a `manifest.json` in that directory. A bundle's `snapshots/` and `attachments/` subdirectories are not separate corpus roots.
+
+Key derivation is deterministic. The root bundle key is `'.'`; descendant keys are slash-separated relative paths with no leading `./`. Backslashes from Windows paths are normalized to `/`.
+
+Canonical order is:
+
+```text
+metadata.recordedAt ASC, metadata.sessionId ASC, key ASC
+```
+
+This order is deterministic for a stable corpus and useful for human reading. The `key` tiebreaker closes timestamp/session collisions.
+
+## 7. Bundle Format Integration
+
+Spec 7 composes with FileSink's existing format. It does not add files to a bundle directory and does not require FileSink to write index-specific sidecars.
+
+`BundleCorpusEntry.openSource()` returns `new FileSink(entry.dir)` typed as `SessionSource`. `FileSink` already reloads `manifest.json` in its constructor and implements the read-side methods. `BundleCorpusEntry.loadBundle()` returns `entry.openSource().toBundle()` with the caller-asserted generic type applied at the corpus boundary. This preserves the single source of truth for full bundle materialization: FileSink owns bundle loading.
+
+The manifest may contain dataUrl attachment bytes when a caller explicitly opted into manifest embedding. `BundleCorpus` still treats those as manifest bytes: it parses descriptors and derives MIME/count/size metadata, but it does not decode, inspect, or index the embedded payload.
+
+Manifest-derived fields:
+
+- `schemaVersion`: from manifest.
+- `metadata`: frozen defensive copy of `SessionMetadata`; `failedTicks` is copied and frozen when present.
+- `attachmentCount`: `manifest.attachments.length`.
+- `attachmentBytes`: sum of `attachments[].sizeBytes`.
+- `attachmentMimes`: sorted unique `attachments[].mime` values.
+- `hasFailures`: `(metadata.failedTicks?.length ?? 0) > 0`.
+- `failedTickCount`: `metadata.failedTicks?.length ?? 0`.
+- `materializedEndTick`: finalized-manifest, incomplete-aware upper bound for persisted content.
+
+Content-derived fields are intentionally absent. For example, command type counts belong either in Spec 8 metrics or in a later content-summary index.
+
+## 8. Determinism
+
+Filesystem enumeration order is not portable. `BundleCorpus` sorts entries using the canonical order above before exposing them. `entries(query)` and `bundles(query)` preserve that order after filtering. `[Symbol.iterator]` delegates to `bundles()` with no query.
+
+This matters for user-defined metrics marked `orderSensitive: true`. Spec 8's built-ins are order-insensitive, but the corpus should still offer stable iteration so order-sensitive user metrics can opt into a deterministic disk-backed source.
+
+Symlinks/junctions are skipped rather than followed. This avoids platform-specific traversal and symlink-loop behavior, and it keeps discovery bounded by the real directory tree under `rootDir`.
+
+Volatile metadata remains volatile. The corpus can query `sessionId` and `recordedAt`, but it does not normalize or hide them. Built-in metrics still avoid volatile fields.
+
+## 9. CI Pattern
+
+```ts
+import {
+  BundleCorpus,
+  runMetrics,
+  bundleCount,
+  sessionLengthStats,
+  commandValidationAcceptanceRate,
+} from 'civ-engine';
+
+const corpus = new BundleCorpus('artifacts/synth-corpus');
+
+const current = runMetrics(
+  corpus.bundles({ sourceKind: 'synthetic', incomplete: false }),
+  [
+    bundleCount(),
+    sessionLengthStats(),
+    commandValidationAcceptanceRate(),
+  ],
+);
+
+console.log(corpus.entries({ failedTickCount: { min: 1 } }).map((entry) => entry.key));
+console.log(current);
+```
+
+For replay investigation:
+
+```ts
+const failed = corpus.entries({ failedTickCount: { min: 1 } })[0];
+if (!failed) {
+  throw new Error('no failed bundle matched the query');
+}
+const source = failed.openSource();
+const replayer = SessionReplayer.fromSource(source, { worldFactory });
+const firstFailure = failed.metadata.failedTicks![0];
+if (firstFailure <= failed.metadata.startTick) {
+  throw new Error('failure occurred at the first recorded tick; inspect snapshots directly');
+}
+const beforeFailure = firstFailure - 1;
+const world = replayer.openAt(beforeFailure);
+```
+
+For bundles without recorded failures, `entry.materializedEndTick` is the manifest-derived upper bound to try first. `SessionReplayer.openAt()` still owns the final replayability decision because it also checks command payloads and full bundle integrity.
+
+For custom metadata filters:
+
+```ts
+const longRuns = corpus.entries({ sourceKind: 'synthetic' })
+  .filter((entry) => entry.metadata.durationTicks >= 1000);
+const longRunMetrics = runMetrics(longRuns.map((entry) => entry.loadBundle()), [bundleCount()]);
+```
+
+`Array.prototype.map` is fine here because `entries()` returns an in-memory entry array. For very large corpora, use a generator around entries to avoid materializing bundles:
+
+```ts
+function* bundlesFor(entries: readonly BundleCorpusEntry[]) {
+  for (const entry of entries) yield entry.loadBundle();
+}
+```
+
+## 10. Performance
+
+Construction cost is O(number of directories visited + number of manifests). No JSONL streams, snapshot files, or sidecar bytes are read during construction or `entries()`. Each manifest parse is usually small and bounded by metadata plus attachment descriptors because FileSink defaults attachments to sidecars; explicit dataUrl attachments are embedded in `manifest.json` and can make manifest parsing larger.
+
+`entries(query)` is O(number of indexed entries) and allocation-light: it returns a new array of existing frozen entry objects. `bundles(query)` is O(number of matching entries) plus full bundle load cost per yielded entry. Because `loadBundle()` delegates to `FileSink.toBundle()`, full bundle memory cost is exactly today's eager bundle materialization cost, paid one bundle at a time by generator consumers.
+
+No persisted index cache ships in v1. If corpus construction becomes a measured bottleneck, a future spec can add `writeCorpusIndex()` with explicit invalidation fields (manifest mtime, size, and schema version). Until then, rebuilding from manifests is simpler and less fragile.
+
+Skipping symlinks is also a performance guard: recursive discovery never traverses a linked external tree or loop.
+
+## 11. Testing Strategy
+
+Unit and integration tests target:
+
+- **Discovery:** root itself can be a bundle with key `'.'`; flat child bundles are found with `scanDepth: 'children'`; recursive nested bundles are found with `scanDepth: 'all'`; `scanDepth: 'root'` skips children; `scanDepth: 'children'` skips grandchildren.
+- **Symlink handling:** directory symlinks or junction-like entries are skipped and do not produce duplicate entries or recursive loops where the platform/test environment supports symlink creation.
+- **Stable ordering:** files created in arbitrary order still produce entries sorted by canonical `recordedAt`, then `sessionId`, then `key`.
+- **Manifest-only listing:** `entries()` does not read JSONL streams or snapshots. A bundle with a valid manifest but malformed `ticks.jsonl` still appears in `entries()`, and the malformed stream error surfaces only when `loadBundle()` is called.
+- **Sidecar boundary:** a bundle with a manifest-sidecar descriptor but missing sidecar bytes can still be listed and loaded as a `SessionBundle`; the missing bytes surface only when `readSidecar(id)` is called on the opened source.
+- **Query filters:** each built-in filter shape has coverage: exact `sourceKind`, optional `sourceLabel`, `incomplete`, numeric ranges, `policySeed`, normalized `recordedAt`, `attachmentMime`, and `failedTickCount`. Combined filters are ANDed.
+- **Attachment MIME matching:** `attachmentMime` matches when any entry MIME equals any requested MIME; multi-attachment bundles prove it is not all-match or exact-set matching.
+- **Optional field semantics:** `policySeed` and `sourceLabel` filters exclude entries where the field is undefined.
+- **Tick horizon guidance:** `materializedEndTick` equals `persistedEndTick` for finalized incomplete bundles and `endTick` for complete bundles; raw `endTick` remains queryable but does not replace the materialized-content field. Recorded failures remain a replay-level constraint enforced by `SessionReplayer`.
+- **Invalid queries:** non-finite numeric ranges, `min > max`, non-integer tick bounds, and non-UTC-Z `recordedAt` bounds throw `CorpusIndexError` with `details.code === 'query_invalid'`.
+- **Invalid manifests:** strict mode throws `CorpusIndexError`; `skipInvalid: true` records `invalidEntries` and omits bad entries. Non-canonical `metadata.recordedAt` is covered as `manifest_invalid`.
+- **Missing keys:** `corpus.get(key)` returns `undefined`; `corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
+- **Error taxonomy:** `CorpusIndexError` is an `instanceof SessionRecordingError` and preserves JSON-shaped details with the discriminator at `details.code`.
+- **FileSink integration:** `entry.openSource()` reads snapshots and sidecars through FileSink; `entry.loadBundle()` matches `new FileSink(dir).toBundle()` for full bundle materialization.
+- **runMetrics integration:** `runMetrics(corpus.bundles(query), metrics)` produces the same result as `runMetrics(matchingEntries.map((e) => e.loadBundle()), metrics)`.
+- **Defensive entry surface:** mutation attempts against returned entries, metadata, or `failedTicks` cannot affect subsequent `entries()` results.
+- **Closed-corpus contract:** tests should document the boundary by constructing corpora only after sinks close. v1 does not test live-writer detection because the feature explicitly does not exist.
+
+Tests should create real temporary FileSink bundle directories, not hand-written partial shapes except for malformed-manifest, malformed-stream, and sidecar-boundary cases.
+
+## 12. Doc Surface
+
+Per AGENTS.md, implementation updates:
+
+- `docs/api-reference.md`: new `## Bundle Corpus Index (v0.8.3)` section for `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
+- `docs/guides/bundle-corpus-index.md`: quickstart, metadata query guide, `runMetrics` integration, replay investigation example, closed-corpus contract, incomplete-bundle behavior, sidecar boundary, scan-depth behavior, limitations.
+- `docs/guides/behavioral-metrics.md`: replace in-memory-only corpus examples with a disk-backed `BundleCorpus` example.
+- `docs/guides/session-recording.md`: add a short "Indexing FileSink bundles" section.
+- `docs/guides/ai-integration.md`: add Spec 7 as Tier-2 corpus query surface.
+- `docs/guides/concepts.md`: add `BundleCorpus` to the standalone utilities list.
+- `README.md`: Feature Overview row, Public Surface bullet, and version badge update.
+- `docs/README.md`: guide index entry.
+- `docs/architecture/ARCHITECTURE.md`: Component Map row and Boundaries paragraph for Bundle Corpus.
+- `docs/architecture/drift-log.md`: append a row.
+- `docs/architecture/decisions.md`: append ADRs 28-31.
+- `docs/design/ai-first-dev-roadmap.md`: update Spec 7 status when implemented.
+- `docs/changelog.md`, `docs/devlog/summary.md`, latest detailed devlog, `package.json`, `src/version.ts`: v0.8.3 additive release entry.
+
+The implementation plan must include the mandatory doc audit: grep or doc-review for stale/removed names and verify canonical docs mention the new API. Stale references in historical changelog/devlog/drift-log entries are allowed; current guides, README, and API reference must reflect the implementation.
+
+The code-review prompt must include: "verify docs in the diff match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides."
+
+## 13. Versioning
+
+Current base is v0.8.2. Spec 7 v1 is additive and non-breaking:
+
+- New `BundleCorpus` subsystem.
+- New public types and error class.
+- No changes to existing unions.
+- No changes to `FileSink`, `SessionSource`, `SessionBundle`, or `runMetrics` signatures.
+
+Ship as v0.8.3 (`c` bump). One coherent implementation commit should include code, tests, docs, ADRs, roadmap status, changelog, devlog, README badge, API reference, doc audit evidence, and version bump.
+
+## 14. ADRs
+
+### ADR 28: Bundle corpus is manifest-first over closed FileSink directories
+
+**Decision:** v1 builds its in-memory index by scanning `manifest.json` files at `BundleCorpus` construction time. It does not write or read a persisted `corpus-index.json`, and it is supported only for closed/frozen bundle directories.
+
+**Rationale:** Manifest scan is simple, deterministic, and uses the existing FileSink contract. A secondary database creates invalidation and stale-index risks before the corpus size proves it is needed. Active-writer detection would require a new FileSink lifecycle marker or lock contract; v1 avoids that by making corpus construction a post-generation step. Future cached index or live-writer work can be explicit and benchmark-driven.
+
+### ADR 29: Corpus composes with `runMetrics` via `Iterable<SessionBundle>`
+
+**Decision:** `BundleCorpus` exposes `bundles(query?)` and `[Symbol.iterator]()` as synchronous `IterableIterator<SessionBundle>`.
+
+**Rationale:** Spec 8 already accepts `Iterable<SessionBundle>`. Changing `runMetrics` or adding a parallel metrics-specific corpus API would duplicate the iteration boundary. Disk-backed corpora should look like any other bundle iterable to metrics code.
+
+### ADR 30: Canonical corpus order is recordedAt, sessionId, key
+
+**Decision:** Entries are sorted by `metadata.recordedAt`, then `metadata.sessionId`, then canonical `key` before any public listing or bundle iteration. The root bundle key is `'.'`; descendants use slash-separated relative paths without a leading `./`.
+
+**Rationale:** Filesystem order differs across platforms. Stable ordering makes order-sensitive user metrics deterministic and makes CI output diff-friendly. `key` is the final tiebreaker because session IDs can collide when bundles are copied. Defining the root key avoids observable API divergence between `'.'`, `''`, and basename encodings.
+
+### ADR 31: v1 query scope is manifest-derived only
+
+**Decision:** `BundleQuery` filters only fields present in `manifest.json` or derived directly from manifest metadata/attachments. It does not include content-derived command/event/marker/snapshot predicates.
+
+**Rationale:** Content queries over commands, events, ticks, markers, snapshots, and metrics require reading larger streams or maintaining a secondary summary index. Mixing that into v1 would either violate the lightweight-listing goal or smuggle in a database. Manifest-only query is the minimal useful surface that unblocks disk-backed metrics and metadata triage.
+
+## 15. Open Questions
+
+1. **Should `recordedAt` query accept `Date` objects?** v1 uses normalized UTC ISO strings only to keep the query type JSON-clean and timezone-explicit. Callers can pass `date.toISOString()`.
+2. **Should `entries()` return an array or an iterator?** v1 returns `readonly BundleCorpusEntry[]` because the index is already in memory and array filtering/slicing is ergonomic. `bundles()` remains a generator to avoid loading full bundles all at once.
+3. **Should BundleCorpus expose content helper methods like `markers(query)`?** Deferred. The first content query should be designed with real caller pressure and likely belongs to a secondary summary layer.
+4. **Should invalid entries be exposed in strict mode?** Strict mode throws immediately, so there is no constructed corpus. `skipInvalid: true` is the diagnostic mode with `invalidEntries`.
+5. **Should FileSink add a durable "closed" marker?** Deferred. v1 documents the closed-corpus requirement without modifying FileSink. If live-writer mistakes become common, a later spec can add explicit lifecycle state to the disk format.
+
+## 16. Future Specs
+
+| Future Spec | What it adds |
+| --- | --- |
+| Spec 4: Standalone Bundle Viewer | Uses `BundleCorpus.entries()` to populate a bundle picker, then `entry.openSource()` / `SessionReplayer` to inspect timelines. |
+| Future: Content Summary Index | Optional derived summaries over markers, command/event types, tick failure phases, and metric outputs. Persisted with explicit invalidation. |
+| Future: Async Corpus | `AsyncBundleCorpus` and `runMetricsAsync` for remote/object-store or very large local corpora. |
+| Future: Corpus Retention | Delete/archive policies by age, source kind, label, failure status, and size. |
+| Future: Live Bundle Discovery | FileSink lifecycle marker or lock-file contract so corpus construction can safely exclude active writers. |
+| Future: StopReason Persistence | If Spec 3 persists `stopReason` into metadata, BundleQuery can add a manifest-only `stopReason` filter. |
+
+## 17. Acceptance Criteria
+
+- `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, `InvalidCorpusEntry`, and supporting types are exported from `src/index.ts`.
+- Corpus construction discovers closed FileSink bundle directories from a root, validates manifests, skips symlinks, honors `scanDepth`, derives `'.'` for a root-bundle key, and exposes stable sorted entries.
+- `entries(query?)` filters without reading JSONL streams, snapshots, or sidecar bytes.
+- Query validation rejects invalid numeric ranges and non-normalized `recordedAt` bounds.
+- Optional manifest-field filters have defined missing-value behavior.
+- `attachmentMime` any-match behavior is covered by a multi-attachment test.
+- `bundles(query?)` and `[Symbol.iterator]` yield full `SessionBundle`s lazily, one entry at a time, via FileSink.
+- `entry.openSource()` and `entry.loadBundle()` compose with `SessionReplayer` and `FileSink.toBundle()`.
+- `corpus.get(key)` returns `undefined`, while `corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'` for missing keys.
+- `runMetrics(corpus.bundles(query), metrics)` works and is covered by tests.
+- Invalid manifest handling has strict and `skipInvalid` coverage, including non-canonical `metadata.recordedAt`.
+- Incomplete-bundle `materializedEndTick` behavior is covered and documented as a manifest materialization horizon, not as a replay guarantee.
+- Explicit dataUrl attachment bytes embedded in `manifest.json` are documented as part of manifest parse cost, not as a separate content index.
+- Sidecar-byte integrity is documented and tested as source-level/on-demand, not `loadBundle()` validation.
+- Defensive metadata freezing/copying is covered by tests.
+- Docs, ADRs, roadmap, changelog, devlog, README badge, API reference, doc audit evidence, and version bump land in the same commit as code.
+- All four engine gates pass: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
+- Multi-CLI design, plan, and code reviews converge per AGENTS.md.
diff --git a/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md b/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md
new file mode 100644
index 0000000..369c626
--- /dev/null
+++ b/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md
@@ -0,0 +1,967 @@
+# Bundle Corpus Index Implementation Plan
+
+> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
+
+**Plan revision:** v1 (2026-04-27) - follows accepted Spec 7 design v4 in `docs/design/2026-04-27-bundle-corpus-index-design.md` after four design-review iterations.
+
+**Goal:** Implement Spec 7: Bundle Search / Corpus Index as a disk-backed manifest-first `BundleCorpus` that indexes closed FileSink bundle directories, filters metadata without loading content streams, and yields `SessionBundle`s lazily for `runMetrics`.
+
+**Architecture:** Add one focused module, `src/bundle-corpus.ts`, that owns filesystem discovery, manifest validation, immutable entry construction, query validation/filtering, and FileSink-backed bundle/source loading. The new module composes with existing session recording, FileSink, SessionReplayer, and behavioral metrics without changing their signatures.
+
+**Tech Stack:** TypeScript 5.7+, Node `fs`/`path`, Vitest 3, ESLint 9, ESM + Node16 module resolution.
+
+**Branch:** None. Commit directly to `main` after plan review, implementation, full gates, staged multi-CLI code review, and final doc updates.
+
+**Versioning:** Base is v0.8.2. Spec 7 is additive and non-breaking, so ship v0.8.3 with one coherent commit.
+
+---
+
+## File Map
+
+- Create `src/bundle-corpus.ts`: public corpus API, query helpers, manifest validation, error class, immutable entries, FileSink integration.
+- Modify `src/index.ts`: export the Spec 7 public surface.
+- Create `tests/bundle-corpus.test.ts`: FileSink-backed corpus tests plus focused malformed-manifest and malformed-stream cases.
+- Modify `package.json`: bump `"version"` from `0.8.2` to `0.8.3`.
+- Modify `src/version.ts`: bump `ENGINE_VERSION` from `'0.8.2'` to `'0.8.3'`.
+- Modify `README.md`: version badge, Feature Overview row, Public Surface bullet.
+- Modify `docs/api-reference.md`: add `Bundle Corpus Index (v0.8.3)` public API section.
+- Create `docs/guides/bundle-corpus-index.md`: quickstart, query guide, metrics integration, replay investigation, scan depth, closed-corpus and sidecar boundaries.
+- Modify `docs/guides/behavioral-metrics.md`: add disk-backed `BundleCorpus` example.
+- Modify `docs/guides/session-recording.md`: add FileSink bundle indexing note.
+- Modify `docs/guides/ai-integration.md`: add Tier-2 corpus query surface.
+- Modify `docs/guides/concepts.md`: add `BundleCorpus` to standalone utilities.
+- Modify `docs/README.md`: add guide index entry.
+- Modify `docs/architecture/ARCHITECTURE.md`: Component Map row and boundary note for Bundle Corpus.
+- Modify `docs/architecture/drift-log.md`: append Spec 7 drift row.
+- Modify `docs/architecture/decisions.md`: append ADRs 28-31 from the accepted design.
+- Modify `docs/design/ai-first-dev-roadmap.md`: mark Spec 7 implemented.
+- Modify `docs/changelog.md`: add v0.8.3 entry.
+- Modify `docs/devlog/summary.md`: add one newest-first Spec 7 line and keep the summary compact.
+- Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md`: append the final task entry after code review artifacts exist.
+- Create `docs/reviews/bundle-corpus-index-T1/2026-04-27/<iteration>/`: staged-diff code-review artifacts.
+
+## Single Task: Spec 7 - Full Surface, Tests, Docs, Review, Commit
+
+**Goal:** Land the entire Spec 7 surface in one v0.8.3 commit: tests, implementation, exports, docs, roadmap status, changelog/devlog, version bump, doc audit, gates, and staged multi-CLI code review.
+
+**Files:**
+- Create: `tests/bundle-corpus.test.ts`
+- Create: `src/bundle-corpus.ts`
+- Modify: `src/index.ts`
+- Modify: docs and version files listed in File Map
+
+### Step 1: Write failing corpus tests first
+
+- [ ] Create `tests/bundle-corpus.test.ts` with FileSink-backed fixtures. Use canonical UTC `recordedAt` values because corpus construction validates UTC-Z strings.
+
+```ts
+import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { afterEach, describe, expect, it } from 'vitest';
+import {
+  BundleCorpus,
+  CorpusIndexError,
+  FileSink,
+  SessionRecordingError,
+  bundleCount,
+  runMetrics,
+  type AttachmentDescriptor,
+  type SessionMetadata,
+  type SessionSnapshotEntry,
+} from '../src/index.js';
+
+const roots: string[] = [];
+
+function tempRoot(): string {
+  const root = mkdtempSync(join(tmpdir(), 'civ-engine-corpus-'));
+  roots.push(root);
+  return root;
+}
+
+afterEach(() => {
+  for (const root of roots.splice(0)) {
+    rmSync(root, { recursive: true, force: true });
+  }
+});
+
+function metadata(id: string, overrides: Partial<SessionMetadata> = {}): SessionMetadata {
+  return {
+    sessionId: id,
+    engineVersion: '0.8.2',
+    nodeVersion: 'v20.0.0',
+    recordedAt: '2026-04-27T00:00:00.000Z',
+    startTick: 0,
+    endTick: 10,
+    persistedEndTick: 10,
+    durationTicks: 10,
+    sourceKind: 'session',
+    ...overrides,
+  };
+}
+
+function snapshot(tick: number): SessionSnapshotEntry {
+  return {
+    tick,
+    snapshot: { tick } as never,
+  };
+}
+
+function writeBundle(dir: string, meta: SessionMetadata, attachments: AttachmentDescriptor[] = []): void {
+  const sink = new FileSink(dir);
+  sink.open(meta);
+  sink.writeSnapshot(snapshot(meta.startTick));
+  if (meta.persistedEndTick !== meta.startTick) {
+    sink.writeSnapshot(snapshot(meta.persistedEndTick));
+  }
+  for (const attachment of attachments) {
+    sink.writeAttachment(attachment, new Uint8Array([1, 2, 3]));
+  }
+  sink.close();
+}
+
+function writeInvalidManifest(dir: string, manifest: unknown): void {
+  mkdirSync(dir, { recursive: true });
+  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
+}
+
+function expectCorpusError(fn: () => unknown, code: string): CorpusIndexError {
+  try {
+    fn();
+  } catch (error) {
+    expect(error).toBeInstanceOf(CorpusIndexError);
+    expect(error).toBeInstanceOf(SessionRecordingError);
+    expect((error as CorpusIndexError).details.code).toBe(code);
+    return error as CorpusIndexError;
+  }
+  throw new Error(`expected CorpusIndexError ${code}`);
+}
+```
+
+- [ ] Add discovery, ordering, and immutable-entry tests.
+
+```ts
+describe('BundleCorpus discovery and entries', () => {
+  it('indexes a root bundle with key "." and freezes entry metadata', () => {
+    const root = tempRoot();
+    writeBundle(root, metadata('root', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+
+    const corpus = new BundleCorpus(root, { scanDepth: 'root' });
+    const entries = corpus.entries();
+
+    expect(entries.map((entry) => entry.key)).toEqual(['.']);
+    expect(entries[0].dir).toBe(root);
+    expect(Object.isFrozen(entries[0])).toBe(true);
+    expect(Object.isFrozen(entries[0].metadata)).toBe(true);
+    expect(corpus.get('.')).toBe(entries[0]);
+
+    expect(() => {
+      (entries[0].metadata as SessionMetadata).sessionId = 'mutated';
+    }).toThrow(TypeError);
+    expect(corpus.entries()[0].metadata.sessionId).toBe('root');
+  });
+
+  it('honors scanDepth and sorts by recordedAt, sessionId, then key', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'b'), metadata('s-2', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeBundle(join(root, 'a'), metadata('s-1', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeBundle(join(root, 'nested', 'c'), metadata('s-0', { recordedAt: '2026-04-27T00:00:00.000Z' }));
+
+    expect(new BundleCorpus(root, { scanDepth: 'root' }).entries()).toEqual([]);
+    expect(new BundleCorpus(root, { scanDepth: 'children' }).entries().map((entry) => entry.key)).toEqual(['a', 'b']);
+    expect(new BundleCorpus(root, { scanDepth: 'all' }).entries().map((entry) => entry.key)).toEqual(['nested/c', 'a', 'b']);
+  });
+
+  it('skips symlinked directories when the platform permits creating them', () => {
+    const root = tempRoot();
+    const target = join(root, 'target');
+    writeBundle(target, metadata('target'));
+    try {
+      symlinkSync(target, join(root, 'link'), 'junction');
+    } catch {
+      return;
+    }
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['target']);
+  });
+});
+```
+
+- [ ] Add manifest-only, sidecar, query, missing-key, invalid-manifest, FileSink, and metrics tests.
+
+```ts
+describe('BundleCorpus query and loading contracts', () => {
+  it('lists from manifest without reading malformed streams until loadBundle', () => {
+    const root = tempRoot();
+    const dir = join(root, 'bad-stream');
+    writeBundle(dir, metadata('bad-stream'));
+    writeFileSync(join(dir, 'ticks.jsonl'), '{"tick":\n{}\n');
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['bad-stream']);
+    expect(() => corpus.loadBundle('bad-stream')).toThrow();
+  });
+
+  it('does not read missing sidecar bytes during listing or loadBundle', () => {
+    const root = tempRoot();
+    const dir = join(root, 'sidecar');
+    writeBundle(dir, metadata('sidecar'), [
+      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
+    ]);
+    rmSync(join(dir, 'attachments', 'screen.png'));
+
+    const corpus = new BundleCorpus(root);
+    const entry = corpus.entries({ attachmentMime: 'image/png' })[0];
+    expect(entry.attachmentCount).toBe(1);
+    expect(entry.attachmentBytes).toBe(3);
+    expect(entry.attachmentMimes).toEqual(['image/png']);
+    expect(entry.loadBundle().attachments).toHaveLength(1);
+    expect(() => entry.openSource().readSidecar('screen')).toThrow();
+  });
+
+  it('filters by manifest fields and ANDs query fields', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'seeded'), metadata('seeded', {
+      recordedAt: '2026-04-27T00:00:01.000Z',
+      sourceKind: 'synthetic',
+      sourceLabel: 'random',
+      policySeed: 42,
+      durationTicks: 30,
+      endTick: 30,
+      persistedEndTick: 30,
+    }));
+    writeBundle(join(root, 'unseeded'), metadata('unseeded', {
+      recordedAt: '2026-04-27T00:00:02.000Z',
+      sourceKind: 'synthetic',
+      durationTicks: 5,
+      endTick: 5,
+      persistedEndTick: 5,
+    }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries({ sourceKind: 'synthetic', policySeed: { min: 40, max: 50 } }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ sourceLabel: 'random' }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ durationTicks: { min: 10 }, recordedAt: { from: '2026-04-27T00:00:00.000Z', to: '2026-04-27T00:00:01.000Z' } }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ key: /seed/ }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
+  });
+
+  it('derives failure counts and materializedEndTick from metadata', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'complete'), metadata('complete', { endTick: 20, persistedEndTick: 20, durationTicks: 20 }));
+    writeBundle(join(root, 'incomplete'), metadata('incomplete', {
+      incomplete: true,
+      endTick: 50,
+      persistedEndTick: 25,
+      durationTicks: 50,
+      failedTicks: [26, 27],
+    }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.get('complete')?.materializedEndTick).toBe(20);
+    expect(corpus.get('incomplete')?.materializedEndTick).toBe(25);
+    expect(corpus.entries({ materializedEndTick: { max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+    expect(corpus.entries({ endTick: { min: 50 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+  });
+
+  it('rejects invalid query ranges and non-canonical recordedAt bounds', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'bundle'), metadata('bundle'));
+    const corpus = new BundleCorpus(root);
+
+    expectCorpusError(() => corpus.entries({ durationTicks: { min: 10, max: 1 } }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ startTick: { min: 0.5 } }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ recordedAt: { from: '2026-04-27' } }), 'query_invalid');
+  });
+
+  it('returns undefined for get and throws entry_missing for strict missing-key APIs', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'bundle'), metadata('bundle'));
+    const corpus = new BundleCorpus(root);
+
+    expect(corpus.get('missing')).toBeUndefined();
+    expectCorpusError(() => corpus.openSource('missing'), 'entry_missing');
+    expectCorpusError(() => corpus.loadBundle('missing'), 'entry_missing');
+  });
+
+  it('handles invalid manifests strictly or through skipInvalid diagnostics', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'good'), metadata('good'));
+    writeInvalidManifest(join(root, 'bad'), {
+      schemaVersion: 1,
+      metadata: metadata('bad', { recordedAt: '2026-04-27T00:00:00-07:00' }),
+      attachments: [],
+    });
+
+    expectCorpusError(() => new BundleCorpus(root), 'manifest_invalid');
+    const corpus = new BundleCorpus(root, { skipInvalid: true });
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['good']);
+    expect(corpus.invalidEntries).toHaveLength(1);
+    expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
+  });
+
+  it('loads FileSink bundles lazily and composes with runMetrics', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'one'), metadata('one', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    writeBundle(join(root, 'two'), metadata('two', { recordedAt: '2026-04-27T00:00:02.000Z', sourceKind: 'synthetic' }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.openSource('one').readSnapshot(0)).toEqual(snapshot(0).snapshot);
+    expect(corpus.loadBundle('one')).toEqual(new FileSink(join(root, 'one')).toBundle());
+    expect([...corpus].map((bundle) => bundle.metadata.sessionId)).toEqual(['one', 'two']);
+    expect(runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()]).bundleCount).toBe(1);
+  });
+});
+```
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: FAIL with module/export errors for `BundleCorpus` and `CorpusIndexError`.
+
+### Step 2: Implement `src/bundle-corpus.ts`
+
+- [ ] Create `src/bundle-corpus.ts` with the public API and helpers below. Keep the module self-contained; do not modify FileSink, SessionSource, SessionBundle, SessionReplayer, or runMetrics.
+
+```ts
+import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
+import { join, relative, resolve, sep } from 'node:path';
+import type { JsonValue } from './json.js';
+import type { AttachmentDescriptor, SessionBundle, SessionMetadata } from './session-bundle.js';
+import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
+import { SessionRecordingError } from './session-errors.js';
+import { FileSink } from './session-file-sink.js';
+import type { SessionSource } from './session-sink.js';
+
+const MANIFEST_FILE = 'manifest.json';
+
+export type BundleCorpusScanDepth = 'root' | 'children' | 'all';
+
+export interface BundleCorpusOptions {
+  scanDepth?: BundleCorpusScanDepth;
+  skipInvalid?: boolean;
+}
+
+export interface NumberRange {
+  min?: number;
+  max?: number;
+}
+
+export interface IsoTimeRange {
+  from?: string;
+  to?: string;
+}
+
+type OneOrMany<T> = T | readonly T[];
+
+export interface BundleQuery {
+  key?: string | RegExp;
+  sessionId?: OneOrMany<string>;
+  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
+  sourceLabel?: OneOrMany<string>;
+  engineVersion?: OneOrMany<string>;
+  nodeVersion?: OneOrMany<string>;
+  incomplete?: boolean;
+  durationTicks?: NumberRange;
+  startTick?: NumberRange;
+  endTick?: NumberRange;
+  persistedEndTick?: NumberRange;
+  materializedEndTick?: NumberRange;
+  failedTickCount?: NumberRange;
+  policySeed?: number | NumberRange;
+  recordedAt?: IsoTimeRange;
+  attachmentMime?: OneOrMany<string>;
+}
+
+export type CorpusIndexErrorCode =
+  | 'root_missing'
+  | 'manifest_parse'
+  | 'manifest_invalid'
+  | 'schema_unsupported'
+  | 'duplicate_key'
+  | 'query_invalid'
+  | 'entry_missing';
+
+export interface CorpusIndexErrorDetails {
+  readonly [key: string]: JsonValue;
+  readonly code: CorpusIndexErrorCode;
+  readonly path?: string;
+  readonly key?: string;
+  readonly message?: string;
+}
+
+export class CorpusIndexError extends SessionRecordingError {
+  override readonly details: CorpusIndexErrorDetails;
+
+  constructor(message: string, details: CorpusIndexErrorDetails) {
+    super(message, details);
+    this.name = 'CorpusIndexError';
+    this.details = details;
+  }
+}
+
+export interface InvalidCorpusEntry {
+  readonly path: string;
+  readonly error: CorpusIndexError;
+}
+
+export interface BundleCorpusEntry {
+  readonly key: string;
+  readonly dir: string;
+  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  readonly metadata: Readonly<SessionMetadata>;
+  readonly attachmentCount: number;
+  readonly attachmentBytes: number;
+  readonly attachmentMimes: readonly string[];
+  readonly hasFailures: boolean;
+  readonly failedTickCount: number;
+  readonly materializedEndTick: number;
+  openSource(): SessionSource;
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
+}
+```
+
+- [ ] Add implementation helpers in the same file with these exact responsibilities:
+
+```ts
+interface FileManifest {
+  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  metadata: SessionMetadata;
+  attachments: AttachmentDescriptor[];
+}
+
+function corpusError(message: string, details: CorpusIndexErrorDetails): CorpusIndexError {
+  return new CorpusIndexError(message, details);
+}
+
+function isRecord(value: unknown): value is Record<string, unknown> {
+  return typeof value === 'object' && value !== null && !Array.isArray(value);
+}
+
+function assertCanonicalIso(value: unknown, label: string, path: string): string {
+  if (typeof value !== 'string' || !value.endsWith('Z')) {
+    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'manifest_invalid', path, message: label });
+  }
+  const parsed = new Date(value);
+  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
+    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'manifest_invalid', path, message: label });
+  }
+  return value;
+}
+
+function validateQueryIso(value: unknown, label: string): string {
+  if (typeof value !== 'string' || !value.endsWith('Z')) {
+    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'query_invalid', message: label });
+  }
+  const parsed = new Date(value);
+  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
+    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'query_invalid', message: label });
+  }
+  return value;
+}
+
+function assertString(value: unknown, label: string, path: string): string {
+  if (typeof value !== 'string') {
+    throw corpusError(`${label} must be a string`, { code: 'manifest_invalid', path, message: label });
+  }
+  return value;
+}
+
+function assertInteger(value: unknown, label: string, path: string): number {
+  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
+    throw corpusError(`${label} must be a finite integer`, { code: 'manifest_invalid', path, message: label });
+  }
+  return value;
+}
+```
+
+- [ ] Validate manifests with runtime checks instead of trusting JSON casts.
+
+```ts
+function validateMetadata(value: unknown, path: string): SessionMetadata {
+  if (!isRecord(value)) {
+    throw corpusError('manifest metadata must be an object', { code: 'manifest_invalid', path, message: 'metadata' });
+  }
+  const sourceKind = value.sourceKind;
+  if (sourceKind !== 'session' && sourceKind !== 'scenario' && sourceKind !== 'synthetic') {
+    throw corpusError('metadata.sourceKind must be session, scenario, or synthetic', { code: 'manifest_invalid', path, message: 'sourceKind' });
+  }
+  const failedTicks = value.failedTicks === undefined
+    ? undefined
+    : Array.isArray(value.failedTicks)
+      ? value.failedTicks.map((tick, index) => assertInteger(tick, `failedTicks[${index}]`, path))
+      : (() => { throw corpusError('metadata.failedTicks must be an array', { code: 'manifest_invalid', path, message: 'failedTicks' }); })();
+  const metadata: SessionMetadata = {
+    sessionId: assertString(value.sessionId, 'sessionId', path),
+    engineVersion: assertString(value.engineVersion, 'engineVersion', path),
+    nodeVersion: assertString(value.nodeVersion, 'nodeVersion', path),
+    recordedAt: assertCanonicalIso(value.recordedAt, 'recordedAt', path),
+    startTick: assertInteger(value.startTick, 'startTick', path),
+    endTick: assertInteger(value.endTick, 'endTick', path),
+    persistedEndTick: assertInteger(value.persistedEndTick, 'persistedEndTick', path),
+    durationTicks: assertInteger(value.durationTicks, 'durationTicks', path),
+    sourceKind,
+  };
+  if (value.sourceLabel !== undefined) metadata.sourceLabel = assertString(value.sourceLabel, 'sourceLabel', path);
+  if (value.incomplete !== undefined) {
+    if (value.incomplete !== true) {
+      throw corpusError('metadata.incomplete must be true when present', { code: 'manifest_invalid', path, message: 'incomplete' });
+    }
+    metadata.incomplete = true;
+  }
+  if (failedTicks) metadata.failedTicks = failedTicks;
+  if (value.policySeed !== undefined) metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
+  return metadata;
+}
+
+function validateAttachment(value: unknown, path: string, index: number): AttachmentDescriptor {
+  if (!isRecord(value)) {
+    throw corpusError(`attachments[${index}] must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}]` });
+  }
+  const ref = value.ref;
+  if (!isRecord(ref)) {
+    throw corpusError(`attachments[${index}].ref must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
+  }
+  const refKeys = Object.keys(ref).filter((key) => ref[key] !== undefined);
+  const validRef =
+    (refKeys.length === 1 && typeof ref.dataUrl === 'string') ||
+    (refKeys.length === 1 && ref.sidecar === true) ||
+    (refKeys.length === 1 && ref.auto === true);
+  if (!validRef) {
+    throw corpusError(`attachments[${index}].ref must be dataUrl, sidecar, or auto`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
+  }
+  return {
+    id: assertString(value.id, `attachments[${index}].id`, path),
+    mime: assertString(value.mime, `attachments[${index}].mime`, path),
+    sizeBytes: assertInteger(value.sizeBytes, `attachments[${index}].sizeBytes`, path),
+    ref: ref as AttachmentDescriptor['ref'],
+  };
+}
+
+function readManifest(manifestPath: string): FileManifest {
+  let parsed: unknown;
+  try {
+    parsed = JSON.parse(readFileSync(manifestPath, 'utf-8')) as unknown;
+  } catch (error) {
+    throw corpusError(`manifest parse failed: ${(error as Error).message}`, { code: 'manifest_parse', path: manifestPath, message: (error as Error).message });
+  }
+  if (!isRecord(parsed)) {
+    throw corpusError('manifest must be an object', { code: 'manifest_invalid', path: manifestPath, message: 'manifest' });
+  }
+  if (parsed.schemaVersion !== SESSION_BUNDLE_SCHEMA_VERSION) {
+    throw corpusError('unsupported bundle schema version', { code: 'schema_unsupported', path: manifestPath, message: String(parsed.schemaVersion) });
+  }
+  if (!Array.isArray(parsed.attachments)) {
+    throw corpusError('manifest attachments must be an array', { code: 'manifest_invalid', path: manifestPath, message: 'attachments' });
+  }
+  return {
+    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
+    metadata: validateMetadata(parsed.metadata, manifestPath),
+    attachments: parsed.attachments.map((attachment, index) => validateAttachment(attachment, manifestPath, index)),
+  };
+}
+```
+
+- [ ] Add `BundleCorpus` with synchronous construction, deterministic discovery, immutable entries, query filtering, and lazy bundle iteration.
+
+```ts
+export class BundleCorpus implements Iterable<SessionBundle> {
+  readonly rootDir: string;
+  readonly invalidEntries: readonly InvalidCorpusEntry[];
+  private readonly _entries: readonly BundleCorpusEntry[];
+  private readonly _byKey: ReadonlyMap<string, BundleCorpusEntry>;
+
+  constructor(rootDir: string, options: BundleCorpusOptions = {}) {
+    const root = resolve(rootDir);
+    if (!existsSync(root) || !lstatSync(root).isDirectory()) {
+      throw corpusError('corpus root is missing or is not a directory', { code: 'root_missing', path: root });
+    }
+    this.rootDir = realpathSync(root);
+    const invalidEntries: InvalidCorpusEntry[] = [];
+    const found = discoverBundleDirs(this.rootDir, options.scanDepth ?? 'all');
+    const byKey = new Map<string, BundleCorpusEntry>();
+    const entries: BundleCorpusEntry[] = [];
+
+    for (const dir of found) {
+      const key = keyForDir(this.rootDir, dir);
+      if (byKey.has(key)) {
+        throw corpusError(`duplicate corpus key ${key}`, { code: 'duplicate_key', path: dir, key });
+      }
+      try {
+        const entry = makeEntry(dir, key, readManifest(join(dir, MANIFEST_FILE)));
+        byKey.set(key, entry);
+        entries.push(entry);
+      } catch (error) {
+        if (options.skipInvalid && error instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
+          invalidEntries.push(Object.freeze({ path: join(dir, MANIFEST_FILE), error }));
+          continue;
+        }
+        throw error;
+      }
+    }
+
+    entries.sort(compareEntries);
+    this._entries = Object.freeze(entries.slice());
+    this._byKey = new Map(entries.map((entry) => [entry.key, entry]));
+    this.invalidEntries = Object.freeze(invalidEntries.slice());
+  }
+
+  entries(query?: BundleQuery): readonly BundleCorpusEntry[] {
+    const predicate = query ? compileQuery(query) : () => true;
+    return Object.freeze(this._entries.filter(predicate));
+  }
+
+  *bundles(query?: BundleQuery): IterableIterator<SessionBundle> {
+    for (const entry of this.entries(query)) {
+      yield entry.loadBundle();
+    }
+  }
+
+  get(key: string): BundleCorpusEntry | undefined {
+    return this._byKey.get(key);
+  }
+
+  openSource(key: string): SessionSource {
+    return requireEntry(this._byKey, key).openSource();
+  }
+
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug> {
+    return requireEntry(this._byKey, key).loadBundle<TEventMap, TCommandMap, TDebug>();
+  }
+
+  [Symbol.iterator](): IterableIterator<SessionBundle> {
+    return this.bundles();
+  }
+}
+```
+
+- [ ] Implement the remaining private helpers exactly enough to satisfy the tests and design:
+
+```ts
+function discoverBundleDirs(root: string, depth: BundleCorpusScanDepth): string[] {
+  const out: string[] = [];
+  function visit(dir: string, remaining: number | 'all'): void {
+    if (existsSync(join(dir, MANIFEST_FILE))) {
+      out.push(dir);
+      return;
+    }
+    if (remaining === 0) return;
+    const nextRemaining = remaining === 'all' ? 'all' : remaining - 1;
+    const children = readdirSync(dir, { withFileTypes: true })
+      .filter((dirent) => dirent.isDirectory() && !dirent.isSymbolicLink())
+      .map((dirent) => dirent.name)
+      .sort((a, b) => a.localeCompare(b));
+    for (const child of children) visit(join(dir, child), nextRemaining);
+  }
+  visit(root, depth === 'root' ? 0 : depth === 'children' ? 1 : 'all');
+  return out;
+}
+
+function keyForDir(root: string, dir: string): string {
+  const rel = relative(root, dir);
+  if (rel.length === 0) return '.';
+  return rel.split(sep).join('/');
+}
+
+function makeEntry(dir: string, key: string, manifest: FileManifest): BundleCorpusEntry {
+  const failedTicks = manifest.metadata.failedTicks ? Object.freeze(manifest.metadata.failedTicks.slice()) : undefined;
+  const metadata = Object.freeze({ ...manifest.metadata, ...(failedTicks ? { failedTicks } : {}) });
+  const attachmentMimes = Object.freeze([...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort((a, b) => a.localeCompare(b)));
+  const materializedEndTick = metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick;
+  const entry: BundleCorpusEntry = {
+    key,
+    dir,
+    schemaVersion: manifest.schemaVersion,
+    metadata,
+    attachmentCount: manifest.attachments.length,
+    attachmentBytes: manifest.attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0),
+    attachmentMimes,
+    hasFailures: (metadata.failedTicks?.length ?? 0) > 0,
+    failedTickCount: metadata.failedTicks?.length ?? 0,
+    materializedEndTick,
+    openSource: () => new FileSink(dir),
+    loadBundle: <
+      TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+      TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+      TDebug = JsonValue,
+    >() => new FileSink(dir).toBundle() as SessionBundle<TEventMap, TCommandMap, TDebug>,
+  };
+  return Object.freeze(entry);
+}
+
+function compareEntries(a: BundleCorpusEntry, b: BundleCorpusEntry): number {
+  return a.metadata.recordedAt.localeCompare(b.metadata.recordedAt)
+    || a.metadata.sessionId.localeCompare(b.metadata.sessionId)
+    || a.key.localeCompare(b.key);
+}
+
+function requireEntry(map: ReadonlyMap<string, BundleCorpusEntry>, key: string): BundleCorpusEntry {
+  const entry = map.get(key);
+  if (!entry) {
+    throw corpusError(`corpus entry ${key} not found`, { code: 'entry_missing', key });
+  }
+  return entry;
+}
+```
+
+- [ ] Implement `compileQuery(query)` with inclusive numeric ranges, one-or-many matching, optional-field exclusion, `attachmentMime` any-match, canonical `recordedAt` bounds, and AND semantics.
+
+```ts
+function asArray<T>(value: OneOrMany<T>): readonly T[] {
+  return Array.isArray(value) ? value : [value];
+}
+
+function assertQueryInteger(value: unknown, label: string): number {
+  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
+    throw corpusError(`${label} must be a finite integer`, { code: 'query_invalid', message: label });
+  }
+  return value;
+}
+
+function assertNumberRange(range: NumberRange, label: string): Required<NumberRange> {
+  if (range.min !== undefined) assertQueryInteger(range.min, `${label}.min`);
+  if (range.max !== undefined) assertQueryInteger(range.max, `${label}.max`);
+  const min = range.min ?? Number.NEGATIVE_INFINITY;
+  const max = range.max ?? Number.POSITIVE_INFINITY;
+  if (min > max) {
+    throw corpusError(`${label}.min must be <= max`, { code: 'query_invalid', message: label });
+  }
+  return { min, max };
+}
+
+function matchesRange(value: number, range: Required<NumberRange>): boolean {
+  return value >= range.min && value <= range.max;
+}
+
+function matchesOne<T>(value: T | undefined, expected: OneOrMany<T> | undefined): boolean {
+  if (expected === undefined) return true;
+  if (value === undefined) return false;
+  return asArray(expected).includes(value);
+}
+
+function compileQuery(query: BundleQuery): (entry: BundleCorpusEntry) => boolean {
+  const ranges = {
+    durationTicks: query.durationTicks ? assertNumberRange(query.durationTicks, 'durationTicks') : undefined,
+    startTick: query.startTick ? assertNumberRange(query.startTick, 'startTick') : undefined,
+    endTick: query.endTick ? assertNumberRange(query.endTick, 'endTick') : undefined,
+    persistedEndTick: query.persistedEndTick ? assertNumberRange(query.persistedEndTick, 'persistedEndTick') : undefined,
+    materializedEndTick: query.materializedEndTick ? assertNumberRange(query.materializedEndTick, 'materializedEndTick') : undefined,
+    failedTickCount: query.failedTickCount ? assertNumberRange(query.failedTickCount, 'failedTickCount') : undefined,
+    policySeed: typeof query.policySeed === 'object' ? assertNumberRange(query.policySeed, 'policySeed') : undefined,
+  };
+  const policySeedScalar = typeof query.policySeed === 'number' ? assertQueryInteger(query.policySeed, 'policySeed') : undefined;
+  const recordedAtFrom = query.recordedAt?.from === undefined ? undefined : validateQueryIso(query.recordedAt.from, 'recordedAt.from');
+  const recordedAtTo = query.recordedAt?.to === undefined ? undefined : validateQueryIso(query.recordedAt.to, 'recordedAt.to');
+  if (recordedAtFrom && recordedAtTo && recordedAtFrom > recordedAtTo) {
+    throw corpusError('recordedAt.from must be <= recordedAt.to', { code: 'query_invalid', message: 'recordedAt' });
+  }
+
+  return (entry) => {
+    const m = entry.metadata;
+    if (query.key instanceof RegExp ? !query.key.test(entry.key) : query.key !== undefined && entry.key !== query.key) return false;
+    if (!matchesOne(m.sessionId, query.sessionId)) return false;
+    if (!matchesOne(m.sourceKind, query.sourceKind)) return false;
+    if (!matchesOne(m.sourceLabel, query.sourceLabel)) return false;
+    if (!matchesOne(m.engineVersion, query.engineVersion)) return false;
+    if (!matchesOne(m.nodeVersion, query.nodeVersion)) return false;
+    if (query.incomplete !== undefined && (m.incomplete === true) !== query.incomplete) return false;
+    if (ranges.durationTicks && !matchesRange(m.durationTicks, ranges.durationTicks)) return false;
+    if (ranges.startTick && !matchesRange(m.startTick, ranges.startTick)) return false;
+    if (ranges.endTick && !matchesRange(m.endTick, ranges.endTick)) return false;
+    if (ranges.persistedEndTick && !matchesRange(m.persistedEndTick, ranges.persistedEndTick)) return false;
+    if (ranges.materializedEndTick && !matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
+    if (ranges.failedTickCount && !matchesRange(entry.failedTickCount, ranges.failedTickCount)) return false;
+    if (policySeedScalar !== undefined && m.policySeed !== policySeedScalar) return false;
+    if (ranges.policySeed && (m.policySeed === undefined || !matchesRange(m.policySeed, ranges.policySeed))) return false;
+    if (recordedAtFrom && m.recordedAt < recordedAtFrom) return false;
+    if (recordedAtTo && m.recordedAt > recordedAtTo) return false;
+    if (query.attachmentMime && !entry.attachmentMimes.some((mime) => asArray(query.attachmentMime!).includes(mime))) return false;
+    return true;
+  };
+}
+```
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: tests compile, then failures point to any mismatch between test names and implementation details rather than missing exports.
+
+### Step 3: Export the public surface
+
+- [ ] Modify `src/index.ts` by adding this export block after the FileSink export and before SessionRecorder:
+
+```ts
+// Bundle Corpus Index - Spec 7 (v0.8.3+): manifest-first query/index layer
+// over closed FileSink bundle directories, with lazy SessionBundle loading.
+export {
+  BundleCorpus,
+  CorpusIndexError,
+  type BundleCorpusScanDepth,
+  type BundleCorpusOptions,
+  type BundleCorpusEntry,
+  type BundleQuery,
+  type NumberRange,
+  type IsoTimeRange,
+  type CorpusIndexErrorCode,
+  type CorpusIndexErrorDetails,
+  type InvalidCorpusEntry,
+} from './bundle-corpus.js';
+```
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: PASS for the focused corpus test file.
+
+### Step 4: Add public documentation and version bump
+
+- [ ] Modify `package.json`:
+
+```json
+{
+  "version": "0.8.3"
+}
+```
+
+- [ ] Modify `src/version.ts`:
+
+```ts
+export const ENGINE_VERSION = '0.8.3' as const;
+```
+
+- [ ] Modify README version badge from `0.8.2` to `0.8.3`. Add a Feature Overview row for "Bundle Corpus Index" and a Public Surface bullet that names `BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, and `CorpusIndexError`.
+- [ ] Add `docs/guides/bundle-corpus-index.md` with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, `Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Sidecar Boundary`, `Limitations`.
+- [ ] In `docs/guides/bundle-corpus-index.md`, include this quickstart:
+
+```ts
+import { BundleCorpus, bundleCount, runMetrics, sessionLengthStats } from 'civ-engine';
+
+const corpus = new BundleCorpus('artifacts/synth-corpus');
+const syntheticComplete = corpus.bundles({ sourceKind: 'synthetic', incomplete: false });
+const metrics = runMetrics(syntheticComplete, [bundleCount(), sessionLengthStats()]);
+console.log(metrics);
+```
+
+- [ ] Modify `docs/api-reference.md` with `## Bundle Corpus Index (v0.8.3)` and one subsection for each public type exported in Step 3. Include constructor, `entries`, `bundles`, `get`, `openSource`, `loadBundle`, and `[Symbol.iterator]` signatures exactly as accepted in the design.
+- [ ] Modify `docs/guides/behavioral-metrics.md` by adding a disk-backed example using `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`.
+- [ ] Modify `docs/guides/session-recording.md` by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and that callers should build the corpus after sinks close.
+- [ ] Modify `docs/guides/ai-integration.md` by adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
+- [ ] Modify `docs/guides/concepts.md` by adding `BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
+- [ ] Modify `docs/README.md` by adding a `bundle-corpus-index.md` guide link.
+- [ ] Modify `docs/architecture/ARCHITECTURE.md` by adding a Component Map row for `src/bundle-corpus.ts` and a Boundaries paragraph that says the subsystem reads manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
+- [ ] Append a row to `docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 unblocks disk-resident corpora for metrics and bundle triage."
+- [ ] Append ADRs 28-31 from `docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing ADRs.
+- [ ] Modify `docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed bundle listing/filtering for Spec 8.
+- [ ] Add a `## 0.8.3 - 2026-04-27` entry at the top of `docs/changelog.md` with what shipped, why, validation commands, and behavior callouts for scan depth, manifest-only listing, closed corpus, and sidecar bytes.
+
+### Step 5: Run focused validation and doc audit
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: PASS.
+- [ ] Run: `npm run typecheck`
+- [ ] Expected: PASS with no TypeScript errors.
+- [ ] Run: `npm run lint`
+- [ ] Expected: PASS with no ESLint errors.
+- [ ] Run this doc audit command:
+
+```powershell
+Select-String -Path README.md,docs\README.md,docs\api-reference.md,docs\guides\*.md,docs\architecture\ARCHITECTURE.md,docs\design\ai-first-dev-roadmap.md -Pattern "BundleCorpus|bundle-corpus-index|0.8.3"
+```
+
+- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, and roadmap mentions. No stale signatures are found during manual inspection of those hits.
+
+### Step 6: Run full engine gates
+
+- [ ] Run: `npm test`
+- [ ] Expected: all tests pass, preserving the current baseline of 845 passing tests plus the new bundle-corpus tests and the existing 2 pending tests.
+- [ ] Run: `npm run typecheck`
+- [ ] Expected: PASS.
+- [ ] Run: `npm run lint`
+- [ ] Expected: PASS.
+- [ ] Run: `npm run build`
+- [ ] Expected: PASS and `dist/bundle-corpus.d.ts` plus `dist/bundle-corpus.js` are emitted by the build.
+
+### Step 7: Stage the coherent change and run multi-CLI code review
+
+- [ ] Stage only the Spec 7 implementation, tests, docs, design/review artifacts, and version files:
+
+```powershell
+git add src\bundle-corpus.ts src\index.ts tests\bundle-corpus.test.ts package.json src\version.ts README.md docs\api-reference.md docs\guides\bundle-corpus-index.md docs\guides\behavioral-metrics.md docs\guides\session-recording.md docs\guides\ai-integration.md docs\guides\concepts.md docs\README.md docs\architecture\ARCHITECTURE.md docs\architecture\drift-log.md docs\architecture\decisions.md docs\design\ai-first-dev-roadmap.md docs\design\2026-04-27-bundle-corpus-index-design.md docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md docs\changelog.md docs\reviews\bundle-corpus-index docs\reviews\bundle-corpus-index-T1
+```
+
+- [ ] Create code-review iteration 1 folders:
+
+```powershell
+New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw
+git diff --staged | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\diff.md
+```
+
+- [ ] Run two independent Codex reviewers and Claude when available. Save raw outputs as `raw/codex.md`, `raw/codex-2.md`, and `raw/opus.md`.
+
+```powershell
+$prompt = @'
+You are a senior code reviewer for civ-engine Spec 7: Bundle Search / Corpus Index. Review the staged diff only. The intent is an additive v0.8.3 API that adds BundleCorpus over closed FileSink bundle directories. Verify correctness, design, deterministic ordering, manifest validation, query validation, FileSink/runMetrics integration, tests, public exports, docs, version bump, and AGENTS.md doc discipline. Verify docs in the diff match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides. Do NOT modify files. Only return real findings with severity, explanation, and suggested fix. If there are no real issues, say ACCEPT.
+'@
+$jobs = @()
+$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex.md } -ArgumentList $prompt
+$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex-2.md } -ArgumentList $prompt
+$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $prompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\opus.md } -ArgumentList $prompt
+Wait-Job -Job $jobs
+$jobs | Receive-Job
+```
+
+- [ ] Synthesize `docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md` with provider-by-provider findings, severity, accepted/nitpick verdicts, and follow-up actions.
+- [ ] If a reviewer reports a real issue, fix it, rerun affected tests, rerun full gates if behavior or public docs changed, stage the updated diff, and create iteration `2` with the same raw/diff/REVIEW layout. Stop when reviewers accept or only nitpick.
+- [ ] If Claude is unreachable because of quota or model access, keep `raw/opus.md` with the error text and proceed with the two Codex outputs, documenting the unreachable Claude reviewer in `REVIEW.md` and the devlog.
+
+### Step 8: Write final devlog entries after code review convergence
+
+- [ ] Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md` with a new timestamped entry for Spec 7. Include action, code reviewer comments by provider and theme, result, reasoning, and notes. Mention the final review iteration folder.
+- [ ] Modify `docs/devlog/summary.md` with one newest-first line: "2026-04-27 - Shipped Spec 7 Bundle Corpus Index in v0.8.3: manifest-first FileSink corpus discovery/query plus lazy bundle iteration for runMetrics." Keep the file under 50 compact lines.
+- [ ] Stage the devlog files:
+
+```powershell
+git add docs\devlog\detailed\2026-04-27_2026-04-27.md docs\devlog\summary.md
+```
+
+- [ ] Run: `git diff --cached --stat`
+- [ ] Expected: staged files are only the coherent Spec 7 implementation, tests, docs, review artifacts, and version bump.
+
+### Step 9: Final verification and direct-to-main commit
+
+- [ ] Run final gates after the devlog update:
+
+```powershell
+npm test
+npm run typecheck
+npm run lint
+npm run build
+```
+
+- [ ] Expected: all four commands pass.
+- [ ] Commit directly on `main`:
+
+```powershell
+git commit -m "feat: add bundle corpus index"
+```
+
+- [ ] Expected: one v0.8.3 commit containing code, tests, docs, ADRs, roadmap status, changelog, devlog, review artifacts, and version bump.
+
+## Acceptance Checklist
+
+- [ ] Public exports include `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
+- [ ] Construction discovers root, child, and nested FileSink bundle directories according to `scanDepth`; root bundle key is `'.'`; descendant keys use `/`.
+- [ ] Discovery skips symlinked directories and stops descending inside bundle directories.
+- [ ] `entries(query?)` reads manifests only and returns deterministic frozen entries in `recordedAt`, `sessionId`, `key` order.
+- [ ] `bundles(query?)` and `[Symbol.iterator]` lazily load full bundles through FileSink.
+- [ ] `get` returns `undefined` for missing keys; `openSource` and `loadBundle` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
+- [ ] Query filters cover exact, one-or-many, numeric range, ISO range, optional field, failure count, materialized end tick, key RegExp, and attachment MIME any-match semantics.
+- [ ] Invalid query and invalid manifest errors use `CorpusIndexError` with JSON-shaped `details.code`.
+- [ ] `skipInvalid` records invalid manifests and omits them from entries.
+- [ ] `runMetrics(corpus.bundles(query), metrics)` is covered by tests.
+- [ ] Docs, ADRs, roadmap, changelog, devlog, API reference, README badge, and version bump ship in the same commit.
+- [ ] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass before commit.
+- [ ] Multi-CLI code review artifacts exist and converge under `docs/reviews/bundle-corpus-index-T1/2026-04-27/`.
</stdin>
2026-04-28T01:19:55.950803Z  WARN codex_analytics::client: events failed with status 403 Forbidden: <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style global>body{font-family:Arial,Helvetica,sans-serif}.container{align-items:center;display:flex;flex-direction:column;gap:2rem;height:100%;justify-content:center;width:100%}@keyframes enlarge-appear{0%{opacity:0;transform:scale(75%) rotate(-90deg)}to{opacity:1;transform:scale(100%) rotate(0deg)}}.logo{color:#8e8ea0}.scale-appear{animation:enlarge-appear .4s ease-out}@media (min-width:768px){.scale-appear{height:48px;width:48px}}.data:empty{display:none}.data{border-radius:5px;color:#8e8ea0;text-align:center}@media (prefers-color-scheme:dark){body{background-color:#343541}.logo{color:#acacbe}}</style>
  <meta http-equiv="refresh" content="360"></head>
  <body>
    <div class="container">
      <div class="logo">
        <svg
          width="41"
          height="41"
          viewBox="0 0 41 41"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="2"
          class="scale-appear"
        >
          <path
            d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div class="data"><div class="main-wrapper" role="main"><div class="main-content"><noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript></div></div><script>(function(){window._cf_chl_opt = {cFPWv: 'g',cH: '5Jdq5q59PJ5CDNOgfPGA0HG64L72DpFxxemiN4HvmXE-1777339195-1.2.1.1-XXeumcmNB2AADErOI41K3Tun13KqN2Lp6C7Im_VEY8K7ta9stobFO3H0LLCzoIq0',cITimeS: '1777339195',cRay: '9f323dd6abe48627',cTplB: '0',cTplC:1,cTplO:0,cTplV:5,cType: 'managed',cUPMDTk:"/backend-api/codex/analytics-events/events?__cf_chl_tk=kf77K.IOZ._gJSq6inv61ciOIl1J7hGSc5SXq7.Gqjg-1777339195-1.0.1.1-j_M4ehITT_263wLETOgejJVC0OvcBeCuQQ0ZVZPq8Mc",cvId: '3',cZone: 'chatgpt.com',fa:"/backend-api/codex/analytics-events/events?__cf_chl_f_tk=kf77K.IOZ._gJSq6inv61ciOIl1J7hGSc5SXq7.Gqjg-1777339195-1.0.1.1-j_M4ehITT_263wLETOgejJVC0OvcBeCuQQ0ZVZPq8Mc",md: 'Mr8v5lnO21.0n4pV3UmearPbKqOigSzDykdAHjpYtj4-1777339195-1.2.1.1-zvo5jtAv6nmU1ijCkmrCgveBnG0gNNu_5kG7HV5Rj5USEL6OapxjpK1FaT.UNELEjlKzhxR_QmCnDGv.JVi0CNzYyxZhOyWz94Zi_wEO_vd8TwxBPvc6WcvHSPk_ddClRxcK0VfgN3bsa5ft5Kfhy26l9cngmrSRaLM5KflNb4zX.2B9EEMGgiEK6YvQCjkzlmXrH88LR4VWBMh5tY4DBXp1M1mEOOkkn5HjNUattZS6u6I1IUunSkiyopLnd.8bqMB0II.4elsDxUTMJMD6sW0ZYrCA8lS.XN7V62avXtzN74Kxb2tbJ45uP9E6O9eHy7iBwu2wMHfJfRDLzI3OElOgrQPhIm6l7SqQMezKYLYkhy0mzBsxkCeUWy1N2Q69EN7FRhyFxPbqypREdmtXquQX4PIpt.aFFqNnGFdrxgBCtHzfmSu6nOZcYwJKcrS7q5c0KX6HYldrpW41MkMdgQpd0WXaotG6mAnM6suGItrCt1a8xl8z9nhFMA1UlC7my.z9M_oi_80f6wTS38ezO3SLOavIKD76GNX3uXtyvquKtZcFALW8S7zwrIV9T9v.VNrSJ0mbdzRNWjohNPHVI69DAztfrupU8VvwymGlRDzA2K.GXL5xs1w0IgsoLGUXAanncKxZne1eLppgU9no8HhiFnWGfymn.UNbuGLlVcVHkdRrOCjJcDUK6bSaTPPC3GoXMqlxAESfaR8Uqwki796Ow0VEYDDOoutPfhtqPUcvD.XkbDliQTFf1cgnj1bTlcidvWZPajSb8MXr0fY_zzdMQWw3bGdY.ikuJxdosGdORf4s6YxD5AU_CykkrA.lfYPCOtZAbuKonYEyZjKykZez3kSHFeWehy1c8dRCWyd9PdTZsO.xXY.1d4YWchu_C.3pD.8EXb2QtfQgkD8Vabijf6LfTWsVyRkGdA1M6ZIWguglFaYP1rVyR7tHwHo0u8GPR8HXNdMkImSfOKKhYidQKuFJIVfX0MNq1URB9INEowBOCtbhIQ.PtNTzoUil7QymtADl8o6WPTT3dKXPpMjzymIbb_6rQ7.H.zjpU0cbyr4DZ20oJbq9YH_wWVt4wNLgnHLg8f9YPzL2kPfOQQ',mdrd: 'NMO9lqUBdycxNPzp2dLQcnUhQ80rxzT_AwaxxL02xmE-1777339195-1.2.1.1-yMwei9Uu7abB5cgxPhErxfUOjBslvcJ3pxIlbcOzuglFKTb9avQDL7EIE.LxBIwc6oEpej_vJ_9tFGT.TvEW.YokCH9.DxPkEkWdYwBYn0nRjPNaqR3bBoLKaTYZAmGElxhE6S7LqvXwnoyYEguV0gDRmboUjOKzjtuOUEJIi0Hq9VWIurwylXq5b1PDbrP7VNILQlVXlqvVJ70RPHwAgy48QPwfSfk1xt3IpTVAvpDWsilZI0w4yALYzoKFD6iEcTfKzZdBj7.MAAECLtuuWhqSY05ovYG16yJIZXnpWNuW2gj1kxCoW3fXy0D9ZLly69uTobaEuC.BTsquxTh.AlLGsMUFAT8MsP3CQ0K_BlA8zG0pEPWMBVWAEAiBcQ4TojiKZbJXpms9wQR31hHcp6Lxvpr8Xk3BkSY35fipiiWip6WJHE0ILcdvfBhZzGgWuAjDZ9FfLotp59.SGiEBGqhb9EgjtJrkW36UO863eZcFrtfOPDejznLg3JgfMCdKXSU9M_Y_fnA.9hj53Sv7GTk4JFv.G76diHs7MCT.lGYzmWRvonzx9cdoH7ESDksEnBaDg1Fq2I4tiLRUOXomqeIJ8.wKf6FIBmkRxkhE5YQ_qPBS.yl3SD7vk5XZDlJTYKiYWyKefA1534cFa5nkw5MhtdFDKJzMXqi_fIIXaN0f5zUejjh1NB8hU42jNxi6.BM_d5dH91CWmwyCpaAqNlXtjRVFKOe9kUvS_1zGnmHJwMP13pqh8szEu4ArOPdaEtHqPHR7tTmnRB1i4NPV6Vc6xDsDjriYIhW8gjXxxqPs0NFzKb29.i6xG5sBeeJLWxM7LMzkz7pW2wlmE44_FEP6pHhONjU_lqI0uI1XYkL32nikx.sioa5XIbBdS9Rgp94O1qGDXQp0bTNXFCuYnOFUXctfoU6jY1eXKtaUwDcjTRkZc77brOXSCYwZp81PqCwHywg7lP1quRDWUVPhZCq8Gn6PljJnOksYbBF.NApA9rVDBKx3xxVxR440gRGr9YkrY0x6oNoSKPHZyGECUrD8l7vMkva9_efHUzej5FxagKYm.zwal4Sve6KGPvvaERlHFUpJBGzTEby6sRMe.2MkquZZunai48bTcOXfHzG.YXfASuLJod8_HtC9akBiBsFPpYEMbP1HP.y.ZxZIXWciOzWNF8MlbU2CWvqLzjvproqU0W91RZvKqwTbruPi4Ak3j7yQsZq94iBEe5eOnk6B_Sifprv5EWSXeU40SEZaDk0PJVMSgPvEucjPzvkKyHC0f1eVFZhhKEY9n_AFJryUIFB8YL2RWO9myBnFnAhAnBtT9TSZk6VwL_IaBVCZRq7zs7Xmi.Z.OUxrgFyq9saFx9.1JIg4q7MBKjvoWZSa5YU4ypXQnXBBtOcrHzrFqaCyj8itwXq5Xp6_.ArmMljJgxdqaSRImHLIl6_4fn5pHNdmrVl6CjIHoojzw3NnbqSbbNxBiflwOp4JnwI2y_ZLNqMcdzGArzp4ODQG2FvQAwevEeqLH2DB1k3R6CTXcPEhjtEkk2nKc4.XhHlmgPA0FO15rNpa_0zwzueBaO9_nE7tDIu6wz2EtzzStKwy55CUfv5MeFTJcrVs6deGN05zH7nxnYM0Tl5tDu5Dl9U5U65tJCLaUaEfQlAmaqRr_RbVQ_oP8G.5n1UrA_H8HeSR5XhzPraR8HAaECa.B8EOT_HtrrAkHxQg6GdwnLdgJtxzgII.fRReivnqnWos9.zZHr2PeEm5k14TwZizQIblTfGnUtP6xFbdPe8P4Gn5dej6s.K7EyQeD6Iu3SZOwyTX3bwnqCfs58brVegbJIsJGM52aKmSEec0fl89N0wtN5clkhehio8g9Nmjz9q0BNhKMstpVsFTEHumDqPfFl3h0kpRBVbBl32QCVN1XrgeH940LsPGRl1KMA4jq32tvcRu77jIvi042X6rU2LKCnRqqPMJCo0onuHnjK1eVhYj9v1hHYbp7cbU3UojY5hZsewO4ITwxvQqDa4z2wKbs93m.ebBQWOkPo9fhUQJwwSL_hkHDWdUs9UVEhJUMYHXMsc59BEiXbHI6mPnJiMrmDn1FntwgAtxxlRYzYnIDJg5BPvSTWvPCo5yCiS5lFblrJupJyoihBO.4_5pAz9s.h6Hm0kEQVxCLRcR6.5aR_cz7iKOhM.xu5NPRriCzXOzHinQp1o3OP3m6rRltsDmg5OkYrApv_CSktO78OeoiYeDxzLShAeTESeQcBuGl3A5i47fj3I2HxCKLZdU1swGaObqByEAoirMdMFPgrco4pN.eoCzf0kPm4oXneoo.Y32YURYrUqj6RZDw5HWJwX04hvF02vT_OdQZc2fGPsQZ5VP_pEe_yBdfsU6BLp_3lUp9TeggWNiILx5dKnDFpco.a5p1fxj3VYs7Mmxsy6bS3pyRUbOV523ouY_eeWqOk749pWHfAXo8RDBCsC9vUBOJshWQJvA4cHbxow4A7w21_QUAiYlPimbusY6m2FsSa4CamSwbSLSgbdfOa6OXzovqYnChsztNWHJuZyQniOQZR.hkR8Ln0oXMaK194la3j8FhUjXe48VugxQ00BhdWAnDDmMrVC.ASy7KOcYW1sG3yUwTp5wegJwbhilebdRb4dtbVUVEhreQWrjqZmgMal.Htadx0J7SglxlBHw9V.dByUVswZiQ1R29f9F.v_YVroSVjfseEs1YqBJNsi.ajP.NiyfdUMuxn6p3ODCCZ60H3TR',};var a = document.createElement('script');a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=9f323dd6abe48627';window._cf_chl_opt.cOgUHash = location.hash === '' && location.href.indexOf('#') !== -1 ? '#' : location.hash;window._cf_chl_opt.cOgUQuery = location.search === '' && location.href.slice(0, location.href.length - window._cf_chl_opt.cOgUHash.length).indexOf('?') !== -1 ? '?' : location.search;if (window.history && window.history.replaceState) {var ogU = location.pathname + window._cf_chl_opt.cOgUQuery + window._cf_chl_opt.cOgUHash;history.replaceState(null, null,"/backend-api/codex/analytics-events/events?__cf_chl_rt_tk=kf77K.IOZ._gJSq6inv61ciOIl1J7hGSc5SXq7.Gqjg-1777339195-1.0.1.1-j_M4ehITT_263wLETOgejJVC0OvcBeCuQQ0ZVZPq8Mc"+ window._cf_chl_opt.cOgUHash);a.onload = function() {history.replaceState(null, null, ogU);}}document.getElementsByTagName('head')[0].appendChild(a);}());</script></div>
    </div>
  </body>
</html>
System.Management.Automation.RemoteException
2026-04-28T01:19:56.572376Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:19:56.572905Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:19:57.960778Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:19:57.961319Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:19:59.166761Z  WARN codex_core_plugins::startup_sync: git sync failed for curated plugin sync; falling back to GitHub HTTP error=failed to activate new curated plugins repo at C:\Users\38909\.codex\.tmp/plugins: Access is denied. (os error 5) git_binary="git"
2026-04-28T01:19:59.350783Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:19:59.351470Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:19:59.401998Z  WARN codex_core::plugins::manager: failed to refresh curated plugin cache after sync: failed to refresh curated plugin cache for game-studio@openai-curated: failed to back up plugin cache entry: Access is denied. (os error 5)
codex
Reviewing the Spec 7 plan against the current repo and AGENTS contract. IΓÇÖm starting with the required skill guidance, then IΓÇÖll inspect the relevant existing APIs and docs so the findings are repo-backed rather than speculative.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path C:\\Users\\38909\\.codex\\plugins\\cache\\openai-curated\\superpowers\\6021bacf\\skills\\using-superpowers\\SKILL.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Path C:\\Users\\38909\\.codex\\skills\\programming-best-practices\\SKILL.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path C:\\Users\\38909\\.codex\\memories\\MEMORY.md -Pattern 'civ-engine|BundleCorpus|session-bundle|runMetrics|FileSink'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 473ms:
---
name: programming-best-practices
description: General coding workflow and engineering guardrails for planning, implementing, debugging, refactoring, reviewing, and validating code changes. Use when Codex is asked to write, edit, review, or test code in any repository, especially when correctness, maintainability, small diffs, and safe verification matter.
---
System.Management.Automation.RemoteException
# Programming Best Practices
System.Management.Automation.RemoteException
## Operate
System.Management.Automation.RemoteException
- Read the relevant code path before editing.
- Trace data flow end to end before deciding on a fix.
- Prefer the smallest change that solves the actual problem.
- Match the existing architecture and conventions unless they are the source of the defect.
- Preserve backward compatibility unless the task explicitly requires a breaking change.
System.Management.Automation.RemoteException
## Change Safely
System.Management.Automation.RemoteException
- Do not overwrite unrelated user changes.
- Treat the worktree as potentially dirty and isolate your diff.
- Make state transitions explicit, especially around async flows and persistence.
- If concurrent results can race, decide which result wins and enforce it in code.
- Handle empty states, errors, cleanup, and cancellation paths deliberately.
- Avoid speculative abstractions until duplication or complexity actually justifies them.
System.Management.Automation.RemoteException
## Validate
System.Management.Automation.RemoteException
- Add or update targeted tests when behavior changes or a bug is fixed.
- Run the smallest meaningful verification first, then widen coverage if needed.
- Verify user-visible behavior, not only internal implementation details.
- If validation cannot run, state exactly what was blocked and what remains unverified.
System.Management.Automation.RemoteException
## Review
System.Management.Automation.RemoteException
- Prioritize bugs, regressions, broken assumptions, and missing tests.
- Present findings before summaries.
- Order findings by severity and include concrete file references.
System.Management.Automation.RemoteException
## Communicate
System.Management.Automation.RemoteException
- State assumptions when they affect implementation choices.
- Call out tradeoffs plainly.
- Explain non-obvious changes at a high level.
- Close with outcome, verification, and remaining risk.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 586ms:
---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---
System.Management.Automation.RemoteException
<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>
System.Management.Automation.RemoteException
<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.
System.Management.Automation.RemoteException
IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.
System.Management.Automation.RemoteException
This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>
System.Management.Automation.RemoteException
## Instruction Priority
System.Management.Automation.RemoteException
Superpowers skills override default system prompt behavior, but **user instructions always take precedence**:
System.Management.Automation.RemoteException
1. **User's explicit instructions** (CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) ╞Æ?" highest priority
2. **Superpowers skills** ╞Æ?" override default system behavior where they conflict
3. **Default system prompt** ╞Æ?" lowest priority
System.Management.Automation.RemoteException
If CLAUDE.md, GEMINI.md, or AGENTS.md says "don't use TDD" and a skill says "always use TDD," follow the user's instructions. The user is in control.
System.Management.Automation.RemoteException
## How to Access Skills
System.Management.Automation.RemoteException
**In Claude Code:** Use the `Skill` tool. When you invoke a skill, its content is loaded and presented to you╞Æ?"follow it directly. Never use the Read tool on skill files.
System.Management.Automation.RemoteException
**In Copilot CLI:** Use the `skill` tool. Skills are auto-discovered from installed plugins. The `skill` tool works the same as Claude Code's `Skill` tool.
System.Management.Automation.RemoteException
**In Gemini CLI:** Skills activate via the `activate_skill` tool. Gemini loads skill metadata at session start and activates the full content on demand.
System.Management.Automation.RemoteException
**In other environments:** Check your platform's documentation for how skills are loaded.
System.Management.Automation.RemoteException
## Platform Adaptation
System.Management.Automation.RemoteException
Skills use Claude Code tool names. Non-CC platforms: see `references/copilot-tools.md` (Copilot CLI), `references/codex-tools.md` (Codex) for tool equivalents. Gemini CLI users get the tool mapping loaded automatically via GEMINI.md.
System.Management.Automation.RemoteException
# Using Skills
System.Management.Automation.RemoteException
## The Rule
System.Management.Automation.RemoteException
**Invoke relevant or requested skills BEFORE any response or action.** Even a 1% chance a skill might apply means that you should invoke the skill to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.
System.Management.Automation.RemoteException
```dot
digraph skill_flow {
    "User message received" [shape=doublecircle];
    "About to EnterPlanMode?" [shape=doublecircle];
    "Already brainstormed?" [shape=diamond];
    "Invoke brainstorming skill" [shape=box];
    "Might any skill apply?" [shape=diamond];
    "Invoke Skill tool" [shape=box];
    "Announce: 'Using [skill] to [purpose]'" [shape=box];
    "Has checklist?" [shape=diamond];
    "Create TodoWrite todo per item" [shape=box];
    "Follow skill exactly" [shape=box];
    "Respond (including clarifications)" [shape=doublecircle];
System.Management.Automation.RemoteException
    "About to EnterPlanMode?" -> "Already brainstormed?";
    "Already brainstormed?" -> "Invoke brainstorming skill" [label="no"];
    "Already brainstormed?" -> "Might any skill apply?" [label="yes"];
    "Invoke brainstorming skill" -> "Might any skill apply?";
System.Management.Automation.RemoteException
    "User message received" -> "Might any skill apply?";
    "Might any skill apply?" -> "Invoke Skill tool" [label="yes, even 1%"];
    "Might any skill apply?" -> "Respond (including clarifications)" [label="definitely not"];
    "Invoke Skill tool" -> "Announce: 'Using [skill] to [purpose]'";
    "Announce: 'Using [skill] to [purpose]'" -> "Has checklist?";
    "Has checklist?" -> "Create TodoWrite todo per item" [label="yes"];
    "Has checklist?" -> "Follow skill exactly" [label="no"];
    "Create TodoWrite todo per item" -> "Follow skill exactly";
}
```
System.Management.Automation.RemoteException
## Red Flags
System.Management.Automation.RemoteException
These thoughts mean STOP╞Æ?"you're rationalizing:
System.Management.Automation.RemoteException
| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ╞Æ%├┐ using the skill. Invoke it. |
System.Management.Automation.RemoteException
## Skill Priority
System.Management.Automation.RemoteException
When multiple skills could apply, use this order:
System.Management.Automation.RemoteException
1. **Process skills first** (brainstorming, debugging) - these determine HOW to approach the task
2. **Implementation skills second** (frontend-design, mcp-builder) - these guide execution
System.Management.Automation.RemoteException
"Let's build X" ╞Æ+' brainstorming first, then implementation skills.
"Fix this bug" ╞Æ+' debugging first, then domain-specific skills.
System.Management.Automation.RemoteException
## Skill Types
System.Management.Automation.RemoteException
**Rigid** (TDD, debugging): Follow exactly. Don't adapt away discipline.
System.Management.Automation.RemoteException
**Flexible** (patterns): Adapt principles to context.
System.Management.Automation.RemoteException
The skill itself tells you which.
System.Management.Automation.RemoteException
## User Instructions
System.Management.Automation.RemoteException
Instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 777ms:
System.Management.Automation.RemoteException
C:\Users\38909\.codex\memories\MEMORY.md:37:# Task Group: civ-engine occupancy binding + aoe2 feedback sync
C:\Users\38909\.codex\memories\MEMORY.md:38:scope: occupancy/crowding engine work, feedback closure, and 
validation/commit expectations when the task spans `civ-engine` plus external `aoe2` feedback docs
C:\Users\38909\.codex\memories\MEMORY.md:39:applies_to: cwd=C:\Users\38909\Documents\github\civ-engine and 
C:\Users\38909\Documents\github\aoe2\docs\engine-feedback; reuse_rule=reuse for 
occupancy/passability/benchmarking/feedback-sync work in these repos, but re-check paths and current docs ownership 
before applying elsewhere
C:\Users\38909\.codex\memories\MEMORY.md:45:- 
rollout_summaries/2026-04-20T21-23-41-qDdk-occupancy_binding_hardening_and_feedback_closure.md 
(cwd=C:\Users\38909\Documents\github\civ-engine, rollout_path=C:\Users\38909\.codex\sessions\2026\04\20\rollout-2026-04
-20T14-23-41-019dacc7-1427-74c1-8010-592e45136ee6.jsonl, updated_at=2026-04-21T03:53:51+00:00, 
thread_id=019dacc7-1427-74c1-8010-592e45136ee6, success; includes external aoe2 feedback-doc sync)
C:\Users\38909\.codex\memories\MEMORY.md:201:# Task Group: idle-life spec, civ-engine implementation planning, and 
shell-scoped placement input
C:\Users\38909\.codex\memories\MEMORY.md:202:scope: early-project discovery for `idle-life`, engine-aware planning 
against `civ-engine`, and the client-shell input architecture that emerged from the Escape-to-cancel placement refactor
C:\Users\38909\.codex\memories\MEMORY.md:203:applies_to: cwd=C:\Users\38909\Documents\github\idle-life with reference 
docs in C:\Users\38909\Documents\github\civ-engine; reuse_rule=reuse for future idle-life planning and client input 
work in this checkout, but treat engine-fit conclusions as civ-engine-specific
C:\Users\38909\.codex\memories\MEMORY.md:215:## Task 2: Convert the spec into a civ-engine-aligned implementation plan
C:\Users\38909\.codex\memories\MEMORY.md:223:- Turn it into an implementation plan, civ-engine, 
design/implementation-plan.md, deterministic, headless, ECS, command event driven, fine-grid placement, worker-hosted 
World, WorldDebugger, runScenario, behavior tree
C:\Users\38909\.codex\memories\MEMORY.md:240:- when the user asked to "Turn it into an implementation plan using the 
game engine `civ-engine` available under `documents/github/civ-engine`. Study its docs." -> make plans engine-aware, 
not just feature-wishlist driven [Task 2]
C:\Users\38909\.codex\memories\MEMORY.md:247:- `civ-engine` docs show the engine is deterministic, headless, 
ECS-based, command/event driven, and grid-based, so "freeform" should be interpreted as fine-grid placement in 
simulation with smooth rendering handled separately [Task 2]
C:\Users\38909\.codex\memories\MEMORY.md:257:- symptom: a civ-engine-based plan assumes pixel-perfect free placement 
or continuous physics -> cause: planning from the fantasy instead of the engine contract -> fix: keep one 
authoritative integer-grid simulation and let the renderer/client shell handle smooth presentation and 
desktop-companion window behavior [Task 2]
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:20:16.127010Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:20:16.127702Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
Using `using-superpowers` for process compliance and `programming-best-practices` for the review rubric. IΓÇÖm checking the current repo surfaces now so I can test the plan against the actual `civ-engine` APIs, docs layout, and gate expectations.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\devlog\\summary.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\architecture\\ARCHITECTURE.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\38909\Documents\github\civ-engine
2026-04-28T01:20:29.863318Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
fatal: detected dubious ownership in repository at 'C:/Users/38909/Documents/github/civ-engine'
'C:/Users/38909/Documents/github/civ-engine' is owned by:
	'S-1-5-21-1271198036-759608721-3065425230-1001'
but the current user is:
	'S-1-5-21-1271198036-759608721-3065425230-1004'
To add an exception for this directory, call:
System.Management.Automation.RemoteException
	git config --global --add safe.directory C:/Users/38909/Documents/github/civ-engine
System.Management.Automation.RemoteException
 exited 1 in 498ms:
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
fatal: detected dubious ownership in repository at 'C:/Users/38909/Documents/github/civ-engine'
'C:/Users/38909/Documents/github/civ-engine' is owned by:
	'S-1-5-21-1271198036-759608721-3065425230-1001'
but the current user is:
	'S-1-5-21-1271198036-759608721-3065425230-1004'
To add an exception for this directory, call:
System.Management.Automation.RemoteException
	git config --global --add safe.directory C:/Users/38909/Documents/github/civ-engine
System.Management.Automation.RemoteException
 succeeded in 662ms:
# Devlog Summary
System.Management.Automation.RemoteException
- 2026-04-27: Spec 8 ╞Æ?" Behavioral Metrics over Corpus (v0.8.2) ╞Æ?" `runMetrics(bundles, metrics)` pure-function reducer over `Iterable<SessionBundle>` + 11 engine-generic built-in metric factories + accumulator-style `Metric` contract + `compareMetricsResults` thin delta helper. 5 ADRs (23-27). Single-commit ship per AGENTS.md doc-with-code rule. 44 new tests; 842 passed + 2 todo. **Tier-2 of AI-first roadmap implemented; Spec 1+3+8 complete.** Devlog rolled over to `2026-04-27_2026-04-27.md` (active file hit 841 lines).
- 2026-04-27: Spec 3 T3 (v0.8.1) ╞Æ?" Determinism integration tests (selfCheck round-trip, production-determinism dual-run, sub-RNG positive/negative, poisoned-bundle replay throws, pre-step abort vacuous, bundle╞Æ+'script regression) + structural docs (ARCHITECTURE Component Map, drift-log, roadmap status ╞Æ+' Implemented for Spec 3 + Spec 1, ai-integration Tier-1 reference). 7 new tests; 798 passed + 2 todo. **Spec 3 implementation complete (T1+T2+T3); awaiting merge authorization.**
- 2026-04-27: Spec 3 T2 (v0.8.0, **b-bump**) ╞Æ?" `runSynthPlaytest` harness + SessionMetadata.sourceKind union widened to add 'synthetic' (breaking for assertNever consumers, per ADR 20). Sub-RNG init via `Math.floor(world.random() * 0x1_0000_0000)` pre-connect; `terminalSnapshot:true` hardcoded; 5-value stopReason union with separate connect-time-failure (re-throw) and mid-tick-failure ('sinkError') paths. ADRs 20, 20a, 21, 22. 17 new harness tests; 789 passed + 2 todo.
- 2026-04-27: Spec 3 T1 (v0.7.20) ╞Æ?" Synthetic Playtest Policy interface + 3 built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`). 4-generic shape matches `World<...>`; sub-RNG via `PolicyContext.random()` (ADR 19). `runSynthPlaytest` harness ships in T2 (v0.8.0). 13 new tests; 772 passed + 2 todo.
- 2026-04-27: Session-recording followup 4 (v0.7.19) ╞Æ?" Clause-paired determinism tests for A11.1 clauses 1, 2, 7 (clean+violation each). Clauses 4, 6 added as `it.todo` (hard fixtures). 6/8 testable clauses covered now (was 3/8). 759 tests + 2 todo.
- 2026-04-27: Session-recording followups 2+3 (v0.7.18) ╞Æ?" terminated-state guard on user-facing recorder methods (Opus L2; +1 regression test); World.applySnapshot extracts `_replaceStateFrom` helper for auditability (Opus L4); api-reference T-prefix section headers renamed to feature labels (Opus L3).
- 2026-04-27: Session-recording followup 1 (v0.7.17) ╞Æ?" `SessionReplayer` pre-groups bundle.commands/.ticks/.executions into per-tick maps at construction; O(NA├║T) ╞Æ+' O(1) per-tick lookup in `selfCheck`/`openAt`. Closes iter-2 M1.
- 2026-04-27: Session-recording iter-1 code-review fixes (v0.7.16). 2 Critical (applySnapshot component preservation + world.grid stale-grid; FileSink cross-process reload) + 4 High (attach default for FileSink; addMarker cell+attachment validation; memory aliasing in capture paths; multi-segment selfCheck submissionSequence false-positive) + 1 Medium (schemaVersion check) + 4 Low/cleanup. 751 tests still pass.
- 2026-04-27: Session-recording T9 (v0.7.15) ╞Æ?" Structural docs: new `docs/guides/session-recording.md` canonical guide; ARCHITECTURE Component Map + Boundaries paragraph; decisions.md ADRs 13╞Æ?"16; drift-log entry; concepts.md/ai-integration.md/debugging.md/getting-started.md/building-a-game.md/scenario-runner.md updates; README + docs/README index. Doc-only; 751 tests unchanged. Implementation phase complete; branch `agent/session-recording` (T0╞Æ+'T9, 9 commits, v0.7.7╞Æ+'v0.7.15) awaits merge authorization.
- 2026-04-27: Session-recording T8 (v0.7.14) ╞Æ?" Integration tests (`tests/scenario-replay-integration.test.ts`, 3 tests) demonstrating scenarioResult╞Æ+'bundle╞Æ+'selfCheck round-trip with extracted setup pattern. Determinism contract paired tests (`tests/determinism-contract.test.ts`, 6 tests) for A11.1 clauses 3/5/8. 751 total tests.
- 2026-04-27: Session-recording T7 (v0.7.13) ╞Æ?" `scenarioResultToBundle()` adapter translating `ScenarioResult` to `SessionBundle` (sourceKind:scenario; startTick from history.initialSnapshot.tick; assertion markers per check outcome; throws if no initial snapshot). 9 new tests, 742 total. Substrate ╞Æ+" scenario loop closed.
- 2026-04-27: Session-recording T6 (v0.7.12) ╞Æ?" `SessionReplayer` with `openAt` + `selfCheck` (3-stream: state/events/executions), `deepEqualWithPath` helper, marker query helpers, `validateMarkers`, range checks, replay-across-failure refusal, no-payload short-circuit, cross-`b`/cross-`a` engine version refusal, cross-Node-major warning. 22 new tests, 733 total.
- 2026-04-27: Session-recording T5 (v0.7.11) ╞Æ?" `SessionRecorder` class with full A7 lifecycle (connect/disconnect/addMarker/attach/takeSnapshot/toBundle). Single `submitWithResult` wrap; mutex via `__payloadCapturingRecorder` slot; periodic + terminal snapshots; live vs retroactive marker validation. 20 new tests, 711 total.
- 2026-04-27: Session-recording T4 (v0.7.10) ╞Æ?" `WorldHistoryRecorder.captureCommandPayloads` opt-in (additive `recordedCommands?` field, mutex via `__payloadCapturingRecorder` slot, single submitWithResult wrap, clear() resets) + `ScenarioConfig.history.captureCommandPayloads` plumbing. 9 new tests, 691 total.
- 2026-04-27: Session-recording T3 (v0.7.9) ╞Æ?" FileSink (disk-backed SessionSink & SessionSource) in `src/session-file-sink.ts`. Manifest cadence (open/per-snapshot/close) atomic via .tmp.json rename. Added @types/node devDep. 15 new tests, 682 total.
- 2026-04-27: Session-recording T2 (v0.7.8) ╞Æ?" SessionSink/SessionSource interfaces + MemorySink in `src/session-sink.ts`. 15 new tests, 667 total. Sync sinks per spec A8.
- 2026-04-27: Session-recording T1 (v0.7.7) ╞Æ?" bundle/marker/error type definitions in `src/session-bundle.ts` + `src/session-errors.ts`; types only, no runtime behavior. 16 new tests, 652 total. Foundation for SessionRecorder / SessionReplayer.
- 2026-04-27: Session-recording T0 setup (v0.7.7-pre, no version bump). Extracted `cloneJsonValue` to `src/json.ts`; added `src/version.ts` (`ENGINE_VERSION`), `src/session-internals.ts` (`World.__payloadCapturingRecorder` slot), `World.applySnapshot(snapshot)` instance method (added to `FORBIDDEN_PRECONDITION_METHODS`). 6 new tests; 636 total pass. Foundation for T1╞Æ?"T9 (see `docs/design/2026-04-27-session-recording-implementation-plan.md`).
System.Management.Automation.RemoteException
> Always read this file at session start to understand current project state.
System.Management.Automation.RemoteException
## Summary
System.Management.Automation.RemoteException
- 2026-04-04: Task 1 complete ╞Æ?" TypeScript project scaffolded with Vitest, ESLint; toolchain verified passing.
- 2026-04-04: Task 2 complete ╞Æ?" EntityManager implemented with free-list recycling and generation counters; 7 tests pass, lint clean.
- 2026-04-04: Task 3 complete ╞Æ?" ComponentStore implemented with sparse array storage, generation tracking, and size tracking; 10 tests pass, lint clean.
- 2026-04-04: Task 4 complete ╞Æ?" SpatialGrid implemented with flat array, lazy Sets, bounds checking, and 4-directional neighbor queries; 10 tests pass, lint clean.
- 2026-04-04: Task 5 complete ╞Æ?" GameLoop implemented with fixed-timestep, step() for deterministic testing, start()/stop() for real-time, spiral-of-death prevention; 4 tests pass, lint clean.
- 2026-04-04: Task 6 complete ╞Æ?" World implemented as integration layer tying EntityManager, ComponentStore registry, SpatialGrid, and GameLoop; spatial index sync before each tick; 14 tests pass, all 45 total pass, lint clean.
- 2026-04-04: Task 7 complete ╞Æ?" ARCHITECTURE.md created with component map, data flow, boundaries, decisions, drift log.
- 2026-04-04: README rewritten with full usage guide ╞Æ?" quick start, API reference, code examples, project structure.
- 2026-04-05: EventBus implemented with emit/on/off/getEvents/clear; generic constraint fixed for strict-mode tsc; 4 tests pass, 49 total pass, lint and typecheck clean.
- 2026-04-05: EventBus remaining unit tests added (off, clear, getEvents); 9 tests pass (54 total), lint clean.
- 2026-04-05: World integration complete ╞Æ?" World and System made generic with TEventMap; EventBus owned as private field; emit/on/off/getEvents methods added; events cleared at start of each tick; 5 new tests, 59 total pass, lint and typecheck clean.
- 2026-04-05: CommandQueue implemented ╞Æ?" typed push/drain buffer with pending getter; TDD (tests-first); 4 new tests, 63 total pass, lint clean.
- 2026-04-05: World submit/registerValidator/registerHandler added ╞Æ?" CommandQueue owned as private field; multi-validator support with short-circuit; duplicate handler guard; TDD; 4 new tests, 67 total pass, lint and typecheck clean.
- 2026-04-05: World processCommands wired into executeTick ╞Æ?" drains CommandQueue and dispatches to handlers; ordered before syncSpatialIndex; error thrown on missing handler; TDD; 4 new tests, 71 total pass, lint and typecheck clean.
- 2026-04-05: Tick-boundary and spatial sync ordering tests added ╞Æ?" 2 new tests, 73 total pass.
- 2026-04-05: Architecture and roadmap docs updated for input command layer ╞Æ?" feature complete.
- 2026-04-05: State serialization complete ╞Æ?" WorldSnapshot type, World.serialize/deserialize, EntityManager getState/fromState, ComponentStore entries/fromEntries, GameLoop setTick; JSON round-trip tested; 13 new tests, 86 total pass, lint and typecheck clean.
- 2026-04-05: State diff output complete ╞Æ?" TickDiff type, dirty tracking on ComponentStore/EntityManager, World.getDiff/onDiff/offDiff; 16 new tests, 102 total pass, lint and typecheck clean.
- 2026-04-05: Resource system complete ╞Æ?" ResourceStore with pools, rates, transfers; World integration with 13 proxy methods; TickDiff resources field; 32 new tests, 134 total pass, lint and typecheck clean.
- 2026-04-06: Docs updated ╞Æ?" clarified AI-native engine scope; removed game-specific planned features from roadmap; added map infrastructure design spec.
- 2026-04-06: Map infrastructure complete ╞Æ?" noise.ts (simplex + octave), cellular.ts (CellGrid + stepCellGrid), map-gen.ts (MapGenerator interface + createTileGrid); all standalone utilities, no World changes; 20 new tests, 154 total pass, lint and typecheck clean.
- 2026-04-06: Configurability audit ╞Æ?" made positionKey, maxTicksPerFrame, neighbor offsets, cellular offsets, createTileGrid positionKey all configurable with backward-compatible defaults; 10 new tests, 164 total pass.
- 2026-04-06: Pathfinding module complete ╞Æ?" generic A* findPath<T> with internal min-heap, PathConfig/PathResult types, maxCost/maxIterations/trackExplored options; standalone utility with no World dependency; 11 new tests, 175 total pass, lint and typecheck clean.
- 2026-04-06: Pathfinding complex scenario tests added ╞Æ?" 8 tests: diamond graph, 100x100 grid, winding maze, equal-cost paths, directed edges, inadmissible heuristic, diagonal costs, node revisit; 19 total pathfinding tests pass, lint and typecheck clean.
- 2026-04-06: Pathfinding docs update ╞Æ?" ARCHITECTURE.md and ROADMAP.md updated; 183 total tests pass; pathfinding feature complete.
- 2026-04-06: GameLoop speed control ╞Æ?" setSpeed/getSpeed, pause/resume, isPaused added; NaN/Infinity guard; 12 new tests; 16 total GameLoop tests pass.
- 2026-04-06: World speed control proxies ╞Æ?" 5 proxy methods (setSpeed/getSpeed/pause/resume/isPaused); 3 new tests; 34 total World tests pass.
- 2026-04-06: Simulation speed control docs ╞Æ?" ARCHITECTURE.md and ROADMAP.md updated; "Turn / phase management" removed from roadmap; 198 total tests pass; feature complete.
- 2026-04-06: Tutorials and README rewrite ╞Æ?" getting-started guide, complete colony survival game tutorial, rewritten README with API reference, CLAUDE.md doc maintenance rules.
- 2026-04-06: Client protocol complete ╞Æ?" ClientAdapter with typed ServerMessage/ClientMessage/GameEvent, connect/disconnect/handleMessage; 9 new tests, 207 total pass; docs updated; all roadmap items now built.
- 2026-04-06: Comprehensive documentation ╞Æ?" full API reference, 10 subsystem guides (concepts, entities, systems, spatial grid, commands/events, resources, serialization/diffs, map gen, pathfinding, behavior trees, client protocol); README updated with doc links and missing API entries.
- 2026-04-12: Engine feedback features ╞Æ?" 6 ergonomics improvements from civ-sim-web audit: loose system typing, typed component registry, world-level state store, spatial query helpers (queryInRadius, findNearest), system ordering constraints (before/after), entity tags and metadata with reverse-index; 54 new tests, 377 total pass; snapshot v4; changelog v0.3.0.
- 2026-04-20: Occupancy follow-up closed - OccupancyBinding now owns blocker metadata and destroy-time cleanup, rejects crowding conflicts for block()/occupy()/reserve(), treats fully crowded cells as blocked for passability, and ships measurable occupancy benchmark counters. Default grid-path cache keys now include movingEntity. Validation: 394 tests, typecheck, lint, build, and RTS benchmark all pass.
- 2026-04-23: Engine feedback (civ-sim-web 2026-04-19) ╞Æ?" reactive BT nodes + clearRunningState helper + per-component semantic diff mode; additive, backwards-compatible; 16 new tests, 415 total pass.
- 2026-04-25: Multi-CLI full-codebase review (Codex/Gemini/Opus 1M) ╞Æ+' 25 findings ╞Æ+' fixed in 11 commits with 2 review iterations. Fail-fast tick semantics with `World.recover()`; snapshot v5 round-trips runtime config + per-component options; `ComponentStore.detectInPlaceMutations` opt-out; reactive-BT preempt cleanup; deep-clone defensive copies on `getDiff`/`getEvents`; failed ticks consume distinct tick numbers; setMeta uniqueness throws; `TState` generic on World; 31 new tests, 446 total pass.
- 2026-04-25: Iter-2 multi-CLI review hunt ╞Æ+' 5 iter-1 regressions, 2 new Critical, 3 new High, 5 new Medium, 7 new Low. Batch 1 (v0.4.1) fixes shipped: `findNearest` diagonal-corner correctness (R2) + `serialize`/`deserialize` snapshot isolation via `structuredClone` (C_NEW1). 450 tests pass.
- 2026-04-25: Iter-2 batch 2 (v0.5.0, breaking) ╞Æ?" removed `ComponentStoreOptions.detectInPlaceMutations`, `WorldConfig.detectInPlacePositionMutations`, `World.markPositionDirty`, the per-tick spatial sync scan, and related metrics. All component/position writes must go through `setComponent`/`setPosition`. `world.grid` is now a runtime-immutable read-only delegate. `EventBus.emit` rejects non-JSON payloads. 448 tests pass.
- 2026-04-25: Iter-2 batch 3 (v0.5.1) ╞Æ?" listener exceptions no longer bypass the fail-fast contract: `commandExecutionListener`/`commandResultListener`/`tickFailureListener` invocations are isolated in try/catch with `console.error`. `submit()`/`serialize()` warn once per poison cycle. 452 tests pass.
- 2026-04-25: Iter-2 batch 4 (v0.5.2) ╞Æ?" `TComponents` and `TState` generics now thread through `System`, `SystemRegistration`, `registerSystem`/`registerValidator`/`registerHandler`/`onDestroy`, and `deserialize` so typed component/state access works inside system callbacks. Type-only refactor. 453 tests pass.
- 2026-04-25: Iter-2 batch 5 (v0.5.3) ╞Æ?" medium + polish: setMeta rejects non-finite numbers; findPath skips overcost neighbors; deserialize rejects tags/meta for dead entities; EntityManager.fromState validates alive/generations entries; getLastTickFailure caches the clone; structuredClone replaces JSON.parse(JSON.stringify); registerComponent clones options. Docs: FIFO transfer priority + entity-less static blocks. 459 tests pass.
- 2026-04-25: Iter-2 fix-review iteration 1 (v0.5.4) ╞Æ?" Codex/Gemini/Opus diff review caught several issues; all addressed. `world.grid.getAt()` now copies the cell Set; `getLastTickFailure()` cache reverted (per-call clone); TickDiff/event clones revert to JSON for V8 perf; `serialize({ inspectPoisoned: true })` added for engine-internal debug tooling; ARCHITECTURE/api-reference doc drift cleaned; debug client + RTS benchmark updated for the v0.5.0 metrics shape. 465 tests pass.
- 2026-04-25: Iter-2 fix-review iteration 2 (v0.5.5) ╞Æ?" Gemini CLEAN; Codex/Opus flagged remaining doc drift + missing regression tests. cloneTickFailure unified to JSON (the prior structuredClone "Error preservation" rationale was incorrect ╞Æ?" Error is normalized to a plain object before clone time); ARCHITECTURE.md Boundaries section + debugging.md tables fully scrubbed; 2 new regression tests for the v0.5.4 fixes. 467 tests pass.
- 2026-04-25: Iter-2 fix-review iteration 3 (v0.5.6) ╞Æ?" Gemini CLEAN, Opus CLEAN, Codex flagged additional doc drift in guides + api-reference (System/SystemRegistration/callback signatures still 2-generic in docs). All addressed: public-api-and-invariants.md corrected on in-place mutation semantics; commands-and-events.md tick-timing diagram updated; api-reference.md System/SystemRegistration/LooseSystem types and registerValidator/registerHandler/onDestroy callback signatures all updated to four-generic form. 467 tests pass.
- 2026-04-25: Iter-2 fix-review iteration 4 (v0.5.7) ╞Æ?" Gemini CLEAN; Codex and Opus both flagged residual canonical-guide drift across 7 files (concepts, spatial-grid, systems-and-simulation, getting-started, entities-and-components, serialization-and-diffs, debugging). All addressed in a single doc-cleanup pass; tick-lifecycle diagrams + write-path semantics across all canonical guides now match v0.5.0+ runtime. 467 tests pass; doc-only change.
- 2026-04-25: Iter-2 fix-review iteration 5 (v0.5.8) ╞Æ?" Codex CLEAN, Gemini CLEAN, Opus flagged one remaining stale "accepts versions 1╞Æ?"4" wording in `serialization-and-diffs.md:74` (internally inconsistent with the same file's lines 116/120 saying 1╞Æ?"5). One-line fix.
- 2026-04-25: Iter-2 fix-review iteration 6 ╞Æ?" **all three reviewers CLEAN**. Chain converged after 6 review iterations across 10 commits (v0.4.1 ╞Æ+' v0.5.8). Branch `agent/iter2-fix-review-1` ready to merge. 467 tests pass.
- 2026-04-25: MicropolisCore study ╞Æ+' 3 ideas extracted. Task 1 shipped (v0.5.9): per-system `interval` + `intervalOffset` fields on SystemRegistration / LooseSystemRegistration; schedule matches legacy `w.tick % N === 0` pattern by direct substitution. Iter-1 multi-CLI review (Codex/Claude; Gemini quota-exhausted) caught 2 critical correctness issues (off-by-one schedule + safe-integer hole) and 1 API issue (`phaseOffset` collided with `phase` ╞Æ+' renamed to `intervalOffset`); all addressed in same commit. 24 new tests (incl. legacy-parity, failed-tick interaction, 3-way stagger, MAX_SAFE_INTEGER, non-number guards), 491 total pass.
- 2026-04-25: Task 2 shipped (v0.5.10): `Layer<T>` standalone overlay-map utility for downsampled field data (pollution / influence / weather etc.). World-coord auto-bucketing via `getAt`/`setAt`, cell-coord access via `getCell`/`setCell`, sparse storage with default-value semantics, JSON-serializable round-trip, defensive `structuredClone` on every read AND write boundary. Sibling of `OccupancyGrid` / `VisibilityMap`. Inspired by MicropolisCore's `Map<DATA, BLKSIZE>` template (`map_type.h:111`). Iter-1 multi-CLI review (Codex/Claude) caught defensive-copy holes for object-T (mutating an unset-cell read poisoned the default for every other unset cell), missing safe-integer validation, weak `fromState` shape checks, and inconsistent error types ╞Æ?" all addressed in same commit. 49 new tests (incl. 7 explicit defensive-copy assertions, safe-int rejections, and `fromState` shape rejections), 540 total pass.
- 2026-04-25: Task 3 shipped (v0.5.11): `CommandTransaction` ╞Æ?" atomic propose-validate-commit-or-abort builder over `World` via `world.transaction()`. Buffers component/position/resource mutations + events + `require(predicate)` preconditions; on `commit()` either applies everything (preconditions passed) or applies nothing (any precondition failed). Single `TickDiff` capture when committed inside a tick. Inspired by MicropolisCore's `ToolEffects` (`tool.h:171╞Æ?"305`). v1 surface: components, position, events, resource add/remove. Iter-1 multi-CLI review (Codex/Claude) caught a HIGH bug ╞Æ?" mid-commit throw left `status='pending'`, so retry would double-apply non-idempotent ops like `removeResource`; fixed via `try/finally` in `commit()`. Also caught: ARCHITECTURE doc drift on commit-after-abort semantics, aliasing window for buffered values, type-safety hole in `world.transaction<T>()` generic override (removed), v1 limitations list undercount. 29 new tests (incl. throw-then-no-retry-doubles, aliasing-window-pin), 569 total pass.
- 2026-04-26: Documentation drift audit (no code changes). Fixed 6 issues: broken `[Architecture]` link in docs/README.md, broken devlog links in docs/README.md, broken API-reference link in getting-started.md, incomplete "Included" table + TickDiff structure + "Diffs capture" list in serialization-and-diffs.md, stale snapshot-version paragraph in public-api-and-invariants.md, and missing `Command Transaction` + `Layer` entries in api-reference.md Table of Contents.
- 2026-04-26: Multi-CLI full-review iter-1 batch 1 (v0.6.0, breaking) ╞Æ?" `CommandTransaction` overhaul. Closes 1 Critical + 2 High + 1 Medium + 2 Low: read-only precondition faAade (`ReadOnlyTransactionWorld`) prevents side-effecting predicates from violating atomicity (C1); typed-generic threading restored on `CommandTransaction<TEventMap, TCommandMap, TComponents, TState>` (H1, three-reviewer consensus); `commit()` now warns once on poisoned world (H3); `emit()` validates JSON-compat at buffer time (M1); aborted-vs-committed terminal status separated (L2); `as unknown as` cast removed (L6). 576 tests pass.
- 2026-04-26: Multi-CLI full-review iter-1 batch 2 (v0.6.1) ╞Æ?" `Layer<T>` overhaul (non-breaking). Closes 2 High + 2 Medium + 1 Low: strip-at-write sparsity with `cells.delete` on default-equal writes (H2); primitive fast-path skips `structuredClone` for `Layer<number|boolean|string|null>` (H4); `forEachReadOnly` adds zero-allocation traversal; new `clear`/`clearAt` (L5); `fromState` validates each cell value once not twice (M4); `clone` iterates sparse map directly (M5). 587 tests pass.
- 2026-04-26: Multi-CLI full-review iter-1 batch 3 (v0.6.2) ╞Æ?" `World.deserialize` snapshot-tick validation (M2). Rejects `NaN`/negative/fractional/`Infinity` ticks at load time before they corrupt diff numbering, command sequencing, or interval scheduling. 591 tests pass.
- 2026-04-26: Multi-CLI full-review iter-1 batch 4 (v0.6.3) ╞Æ?" polish. Closes 3 Low: `World.runTick` tick-capture asymmetry hoisted (L1); resources guide `setTransfer` dead reference fixed (L4); `GameLoop.advance` throws `RangeError` on `Number.MAX_SAFE_INTEGER` saturation instead of silent corruption (L7). 592 tests pass.
- 2026-04-26: Multi-CLI full-review iter-1 batch 5 (v0.6.4) ╞Æ?" M3 partial. Extracted ~265 LOC of standalone helper functions from `src/world.ts` into `src/world-internal.ts`. `world.ts` now 2232 LOC (was 2481); deeper class-method split deferred to follow-up. 592 tests pass.
- 2026-04-26: Iter-2 review fix-up (v0.7.0, breaking) ╞Æ?" closes 1 iter-1 regression (R1: C1 was incomplete, missing 9+ real mutating methods including `random()` which broke determinism on the failure path) + 2 High (`Layer.forEachReadOnly` null-coalesce bug, primitive fast-path trusts default not value) + 2 Medium (writer/fromState double-validate) + 4 Low (commit hardcoded message, clone double-clone, getState dead check, MAX_SAFE_INTEGER+1 test). New `FORBIDDEN_PRECONDITION_METHODS` const array as single source of truth. 600 tests pass.
- 2026-04-26: Iter-3 verification caught 2 iter-2 fix-quality regressions (R2_REG1: `warnIfPoisoned` missing from R1 denylist; R2_REG2: L_NEW3 sparsity filter removal exposes object-T contract violation via `forEachReadOnly`). Both fixed in v0.7.1. New meta-test cross-checks `FORBIDDEN_PRECONDITION_METHODS` against `World.prototype` to prevent future denylist holes. Gemini quota-exhausted; Codex+Opus reached consensus. 604 tests pass.
- 2026-04-26: Iter-4 verification ╞Æ?" convergence. All 5 iter-3 fixes verified. One Low caught (L_REG3 regression test was vacuous ╞Æ?" mutated clone-on-read getter, observable nothing); test rewritten to assert underlying-storage identity. Test-only fix, no version bump. 604 tests pass.
- 2026-04-26: Iter-5 verification ╞Æ?" Codex caught new Critical (Opus reported clean, split decision favored Codex). Predicate could mutate via `w.getComponent(e, 'hp')!.current = 0` since `getComponent` returns live `ComponentStore` reference. C1/R1 denylist only blocks write method calls, not in-place edits of reads. Fix in v0.7.2: precondition proxy now `structuredClone`s returns from a curated set (getComponent, getComponents, getState, getResource, getResources, getPosition, getTags, getByTag, getEvents). 3 new regression tests, 607 total pass.
- 2026-04-26: Iter-6 verification ╞Æ?" Codex caught remaining High (`world.grid` public field, not a method, so iter-5 proxy missed it; predicate could monkey-patch `w.grid.getAt`). Opus reported clean + Note about 2 ghost entries in iter-5 wrap set (`getResources`/`getPosition` don't exist on `World`). Fix in v0.7.3: `Object.freeze` on `world.grid` in constructor (structurally enforces the v0.5.0 read-only-delegate promise); ghost entries dropped. 1 new regression test, 608 total pass.
- 2026-04-26: Followups on residuals (v0.7.4). L_NEW6: `as any` cast on commit() emit dispatch replaced with narrower `as keyof TEventMap & string` / `as TEventMap[EmitKey]` casts; eslint-disable removed. N1: `SYSTEM_PHASES` + `SystemPhase` moved from world.ts to world-internal.ts; world.ts re-exports for public API. Circular value-import resolved. M3 deeper split + occupancy-grid split remain deferred (composition redesign needed). Doc audit (api-reference, ARCHITECTURE, drift-log) refreshed for v0.6.0╞Æ?"v0.7.3. 608 tests pass.
- 2026-04-26: Multi-CLI full-review iter-7 (v0.7.5). First broader sweep beyond iter-1╞Æ?"6 CommandTransaction chain. Codex+Opus, Gemini quota-out. 7 findings, all fixed: H1 deserialize accepts dead/non-integer entity IDs in components+resources (now alive+integer-validated at boundary); M1 EventBus listener can mutate engine-owned payload (clone-on-emit per listener); M2 ClientAdapter mapping race after safeSend failure (gated on send result); M3 api-reference snapshot v4╞Æ+'v5 doc fix; L1 octaveNoise2D parameter validation; L2 component-store semantic-mode revert-to-baseline clears dirty; L3 deserialize tick validation hoisted above loaders. 19 new regression tests, 627 total pass.
- 2026-04-26: Multi-CLI full-review iter-8 convergence check (v0.7.6). Codex+Opus both verified all 7 iter-7 fixes landed cleanly; no regressions; no new Critical/High/Medium/Low. Opus flagged one Note (N3) ╞Æ?" same severity class as L2 but on the parallel `wasPresent === false` branch of `ComponentStore.set` (taken after remove() or on first insert when baseline exists). Taken in same iter to keep the L2 contract structurally uniform. 3 new regression tests, 630 total pass. Gemini still quota-exhausted (6th iter in a row).
- 2026-04-26: Multi-CLI full-review iter-9 closing convergence check. **Both Codex and Opus reported zero real findings** at any severity. N3 fix verified across 5 prompt checkpoints. **Loop converged after 9 iterations** (iter-1╞Æ?"6 closed CommandTransaction chain, iter-7 closed 7 broader-sweep findings, iter-8 closed N3, iter-9 clean). No code changes; no version bump. Gemini quota-out 7th iter in a row.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 796ms:
# Architecture
System.Management.Automation.RemoteException
## Overview
System.Management.Automation.RemoteException
Civ-engine is a general-purpose, headless, AI-native 2D grid-based game engine. Built in Node.js/TypeScript with a strict ECS (Entity-Component-System) architecture.
System.Management.Automation.RemoteException
**AI-native** means the engine is designed to be operated by AI agents, not human players directly. Humans provide high-level game designs; AI agents write game logic, submit commands, and observe state. Every design decision prioritizes machine-readability: deterministic tick execution, JSON-serializable state, structured diffs, typed command/event interfaces, and a purely programmatic API with no interactive UI.
System.Management.Automation.RemoteException
The engine provides reusable infrastructure (entities, components, spatial indexing, events, commands, resources, serialization) that game projects consume. It outputs state changes that a separate client can render; it contains no game-specific logic, rendering, or UI code.
System.Management.Automation.RemoteException
## Component Map
System.Management.Automation.RemoteException
| Component      | File                     | Responsibility                                                                         |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| World          | `src/world.ts`           | Top-level API, owns all subsystems, phased system pipeline, metrics, spatial index sync |
| EntityManager  | `src/entity-manager.ts`  | Entity creation/destruction, ID recycling via free-list, generation counters           |
| ComponentStore | `src/component-store.ts` | Sparse array storage per component type, generation counter for change detection       |
| SpatialGrid    | `src/spatial-grid.ts`    | Sparse occupied-cell grid plus read-only view, neighbor/radius queries                 |
| GameLoop       | `src/game-loop.ts`       | Fixed-timestep loop, step() for testing, start()/stop() for real-time, speed multiplier, pause/resume |
| EventBus       | `src/event-bus.ts`       | Typed pub/sub event bus, per-tick buffer, listener registry                            |
| CommandQueue   | `src/command-queue.ts`   | Typed command buffer, push/drain interface                                             |
| CommandTransaction | `src/command-transaction.ts` | Atomic propose-validate-commit-or-abort builder over World; buffers component/position/resource mutations + events + precondition predicates, applies all-or-nothing on `commit()` |
| Serializer     | `src/serializer.ts`      | Versioned WorldSnapshot types for state serialization                                  |
| Diff           | `src/diff.ts`            | TickDiff type for per-tick change sets                                                 |
| ResourceStore  | `src/resource-store.ts`  | Resource pools, production/consumption rates, transfers, dirty tracking                |
| OccupancyGrid  | `src/occupancy-grid.ts`  | Deterministic blocked-cell, footprint, reservation, lifecycle binding, blocker metadata, metrics, and sub-cell crowding tracking |
| Layer          | `src/layer.ts`           | Generic typed overlay map at configurable downsampled resolution; sparse cell storage with default-value semantics, JSON-serializable; multi-resolution field data (pollution, influence, weather, danger, etc.) |
| JSON helpers   | `src/json.ts`            | JSON-compatible component validation and fingerprints for mutation detection           |
| Noise          | `src/noise.ts`           | Seedable 2D simplex noise, octave layering utility                                     |
| Cellular       | `src/cellular.ts`        | Cellular automata step function, immutable CellGrid                                    |
| MapGen         | `src/map-gen.ts`         | MapGenerator interface, createTileGrid bulk tile-entity helper                         |
| Pathfinding    | `src/pathfinding.ts`     | Generic A* pathfinding, graph-agnostic with user-defined callbacks          |
| Path Service   | `src/path-service.ts`    | Grid path helper, deterministic path queue, and cache for batched request handling     |
| RenderAdapter  | `src/render-adapter.ts`  | Projects world state into renderer-facing snapshots and diffs with generation-aware refs |
| ScenarioRunner | `src/scenario-runner.ts` | Headless setup/run/check harness built on World, WorldDebugger, and WorldHistoryRecorder |
| VisibilityMap  | `src/visibility-map.ts`  | Per-player visible/explored cell tracking for fog-of-war style mechanics               |
| WorldDebugger  | `src/world-debugger.ts`  | Structured debug snapshots, warnings, and probe helpers for engine and standalone utilities |
| ClientAdapter  | `src/client-adapter.ts`  | Bridges World API to typed client messages via send callback |
| BehaviorTree   | `src/behavior-tree.ts`   | Generic BT framework: NodeStatus, BTNode, Selector, Sequence, ReactiveSelector, ReactiveSequence, Action, Condition, BTState, createBehaviorTree, clearRunningState |
| SessionRecorder | `src/session-recorder.ts` | Captures live World runs into SessionBundle via SessionSink; mutex-locked single payload-capturing recorder per world (slot at world.__payloadCapturingRecorder); marker validation per spec A6.1; terminal snapshot on disconnect |
| SessionReplayer | `src/session-replayer.ts` | Loads a SessionBundle/Source; openAt(tick) returns paused World; selfCheck() 3-stream comparison (state via deepEqualWithPath, events, executions); failedTicks-skipping; cross-b/cross-Node-major version checks |
| SessionBundle / SessionSink / SessionSource / Marker / RecordedCommand | `src/session-bundle.ts`, `src/session-sink.ts`, `src/session-file-sink.ts` | Shared bundle types + sink/source interfaces + MemorySink + FileSink (disk-backed; manifest atomic-rename; defaults to sidecar attachments). scenarioResultToBundle adapter at `src/session-scenario-bundle.ts`. |
| Synthetic Playtest Harness | `src/synthetic-playtest.ts` | Tier-1 autonomous-driver primitive: `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for N ticks ╞Æ+' `SessionBundle`. Sub-RNG (`PolicyContext.random()`) sandboxed from `world.rng`, seeded from `policySeed`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Composes with `SessionRecorder`/`SessionReplayer`. New in v0.7.20 + v0.8.0 + v0.8.1 (Spec 3). |
| Behavioral Metrics | `src/behavioral-metrics.ts` | Tier-2 corpus reducer over `Iterable<SessionBundle>`. Accumulator-style `Metric<TState, TResult>` contract; 11 engine-generic built-in metrics (`bundleCount`, `sessionLengthStats`, etc.); pure-function `runMetrics` + `compareMetricsResults` delta helper. New in v0.8.2 (Spec 8). |
| Public exports | `src/index.ts`           | Barrel export for the intended package API                                             |
| Types          | `src/types.ts`           | Shared type definitions (EntityId, EntityRef, Position, WorldConfig, InstrumentationProfile) |
System.Management.Automation.RemoteException
## Data Flow
System.Management.Automation.RemoteException
```
World.step()
  -> GameLoop.step()
    -> World.executeTick()
      -> World.eventBus.clear()       [reset buffer from previous tick]
      -> World.entityManager.clearDirty()
      -> World.clearComponentDirty()   [clear dirty flags on all stores]
      -> World.processCommands()       [drain queue, run handlers]
      -> input systems
      -> preUpdate systems
      -> update systems
      -> postUpdate systems
      -> output systems
      -> World.resourceStore.processTick()  [production, consumption, transfers]
      -> World.buildDiff()             [collect dirty state into TickDiff]
      -> World.getMetrics() state updated   [detailed in `full`, coarse in `minimal`, skipped by implicit `step()` in `release`]
      -> notify onDiff listeners
    -> tick++
```
System.Management.Automation.RemoteException
### Spatial Index Sync
System.Management.Automation.RemoteException
Position writes through `world.setPosition()` or `world.setComponent()` with the configured position component (default `'position'`, configurable via `positionKey` in `WorldConfig`) update the component store and spatial grid in lockstep ╞Æ?" the grid stays consistent without any per-tick scan. In-place mutation of position objects (e.g. `world.getComponent(id, 'position').x = 5`) is **not** auto-detected and is a no-op for the grid; game code must call `setPosition` for movement to take effect.
System.Management.Automation.RemoteException
### Entity Destruction
System.Management.Automation.RemoteException
`destroyEntity(id)` performs immediate cleanup:
- Removes entity from grid using `previousPositions` (the grid's last-seen position, kept in sync by `setPosition`)
- Removes all components from all stores
- Removes all resource pools, rates, and transfers for the entity
- Marks entity as dead in EntityManager (ID available for recycling)
System.Management.Automation.RemoteException
## Boundaries
System.Management.Automation.RemoteException
- **World** is the only public entry point. EntityManager, ComponentStore, GameLoop are internal implementation details.
- **Systems** are pure functions `(world: World) => void` or registration objects with a `phase` and `name`. Phases are intentionally lightweight and ordered as `input`, `preUpdate`, `update`, `postUpdate`, `output`.
- **Components** are pure data interfaces. No methods, no inheritance.
- **SpatialGrid** is a sparse map of occupied cells. The grid is updated lock-step with position writes ╞Æ?" every `world.setPosition` / `world.setComponent` on the configured `positionKey` inserts/moves the entity in the grid in the same call, so no per-tick scan is needed. User systems read grid state via `world.grid.getAt()` / `world.grid.getNeighbors()` / `world.grid.getInRadius()`. The `world.grid` property is a read-only delegate at runtime: `getAt()` returns a fresh `Set` copy on each call, the mutating `insert`/`remove`/`move` methods of the underlying `SpatialGrid` are not exposed, and the delegate object itself is `Object.freeze`d in the constructor (since v0.7.3) so attempts to monkey-patch its methods throw `TypeError` in strict mode. This makes the read-only-delegate promise structural rather than convention-only.
- **GameLoop** handles timing only. It knows nothing about entities, components, or systems.
- **EventBus** is owned by World. Systems emit and subscribe via `world.emit()` / `world.on()`. External consumers read events via `world.getEvents()` between ticks. Do not call `eventBus.clear()` directly ╞Æ?" World handles this.
- **CommandQueue** is owned by World. External code submits commands via `world.submit()` or `world.submitWithResult()`, registers validators via `world.registerValidator()`, and registers handlers via `world.registerHandler()`. Do not access the queue directly.
- **CommandTransaction** is a synchronous builder created via `world.transaction()`. It is generic over `<TEventMap, TCommandMap, TComponents, TState>` (matching `World`'s generic order); typed component / state access works inside the transaction the same way it works inside `world.setComponent` / `world.setState`. The transaction buffers proposed mutations (`setComponent`/`addComponent`/`patchComponent`/`removeComponent`/`setPosition`/`addResource`/`removeResource`), buffered events (`emit` ╞Æ?" JSON-compat validated at buffer time, not at commit), and `require()` precondition predicates. **Predicates receive a `ReadOnlyTransactionWorld` faAade**, not the live `World` ╞Æ?" write methods (`setComponent`, `setState`, `emit`, `addResource`, `removeResource`, `destroyEntity`, etc.) are excluded at the type level and rejected at runtime so a side-effecting predicate cannot violate the "world untouched on precondition failure" guarantee. On `commit()` the engine calls `world.warnIfPoisoned('transaction')` (warns once per poison cycle), then runs all preconditions in registration order; if any returns `false` or a string, no mutation or event is applied and the transaction returns `{ ok: false, code: 'precondition_failed', reason }`. Otherwise mutations are applied to the world in registration order via the existing public mutation API (so they get the same liveness/JSON-compat validation as direct calls), then events are emitted via `EventBus`. Transactions are single-use: `commit()` after a previous `commit()` throws; `commit()` after `abort()` returns `{ ok: false, code: 'aborted' }` without mutation, and subsequent builder calls throw an "already aborted" error (not "already committed"). If a buffered mutation throws mid-commit, the transaction is still consumed (status flips to `committed` in a `finally` block) so the caller cannot retry and double-apply earlier mutations ╞Æ?" the world is in a partially-applied state that the caller must reconcile. Reads inside a precondition or after commit see live world state; transactions do not provide a "shadow" overlay view of their own proposed mutations. Buffered values are stored by reference; caller must not mutate buffered objects between buffering and `commit()`. Entity create/destroy, tags, metadata, and world-state writes are not yet wrapped (v1 surface).
- **Serialization** is accessed via `world.serialize()` and `World.deserialize()`. Snapshot version 5 (WorldSnapshotV5) is the current write format and additionally round-trips per-component `ComponentStoreOptions` (the `componentOptions` field) so `diffMode` survives save/load; version 4 includes state, tags, and metadata; version 3 includes resource state and deterministic RNG state; versions 1 and 2 remain readable for compatibility. `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` are also serialized when non-default. The `WorldSnapshot` type is exported from `src/serializer.ts`. Snapshots are plain JSON-serializable objects, and component data plus state values are `structuredClone`d at both serialize and deserialize boundaries so callers cannot write through.
- **State Diffs** are accessed via `world.getDiff()` (pull) or `world.onDiff()` (push). The `TickDiff` type is exported from `src/diff.ts`. Diffs capture entity creation/destruction, component mutations, and resource changes per tick. `getDiff()` returns a JSON-deep-cloned defensive copy ╞Æ?" callers cannot write through to live engine state. During `onDiff` listeners `world.tick === diff.tick`.
System.Management.Automation.RemoteException
- **Tick failure semantics** are fail-fast. A failure in any tick phase (commands, systems, resources, diff, listeners) marks the world as **poisoned**. While poisoned, `world.step()` throws `WorldTickFailureError` and `world.stepWithResult()` returns a `world_poisoned` failure result. `world.isPoisoned()` reports the state; `world.recover()` clears the poison flag along with the cached `lastTickFailure`/`currentDiff`/`currentMetrics`. Failed ticks consume a tick number ╞Æ?" if a tick fails at tick `N+1`, the next successful tick after `recover()` is `N+2`, so failed-tick events and successful-tick events never share a tick number.
- **Metrics** are accessed via `world.getMetrics()` after a tick. They report section timings, per-system timings, query cache hit/miss counts, entity counts, and explicit-sync counts (`spatial.explicitSyncs`, incremented by every `setPosition`-style write). `instrumentationProfile: 'full'` keeps the detailed implicit metrics path, `minimal` keeps coarse implicit metrics, and `release` disables implicit metrics collection on `step()` so shipping runtimes do not pay that cost unless they explicitly use `stepWithResult()`.
- **Rendering** belongs outside the engine. Renderer clients should consume snapshots and tick diffs through `ClientAdapter`, keep visual objects in renderer-owned state, and submit input back as commands. See `docs/guides/rendering.md` for the recommended renderer boundary and Pixi-first reference client shape.
- **RenderAdapter** is an optional projection helper. It turns current world state plus `TickDiff` into renderer-facing `renderSnapshot` and `renderTick` messages using game-owned callbacks. It does not own renderer objects or backend assumptions.
- **Resources** are managed via `world.registerResource()`, `world.addResource()`, `world.removeResource()`, etc. The ResourceStore is owned by World as a private subsystem. Resource rates and transfers are processed automatically after user systems each tick.
- **Noise, Cellular, MapGen** are standalone utilities. They are not owned by World and have no integration point in the tick loop. Game code imports them directly and uses them during setup (before the simulation runs).
- **OccupancyGrid** is a standalone utility. It models blocked cells, occupied footprints, and temporary reservations. `OccupancyBinding` composes it with blocker metadata, destroy-time cleanup hooks, optional sub-cell crowding, and scan metrics when game code wants a higher-level passability surface. These occupancy helpers remain intentionally separate from `SpatialGrid`, which answers proximity rather than passability.
- **Layer** is a standalone typed overlay map. `Layer<T>` represents field data at a configurable downsampled resolution (e.g., a `pollution` map at half-res of the world, or an `influence` map at quarter-res). World coordinates are auto-bucketed via `getAt(worldX, worldY)` / `setAt(worldX, worldY, value)`; cell coordinates are accessible via `getCell` / `setCell`. Storage is **strip-at-write sparse**: writes equal to `defaultValue` delete the underlying entry instead of storing a marker, so the in-memory map and the serialized form agree without a `getState` round-trip. Explicit `clear(cx, cy)` / `clearAt(wx, wy)` methods provide an honest "drop this cell" API. Defensive copies on every read/write boundary protect callers from internal-state aliasing for object `T`; for **primitive `T`** (`number`, `string`, `boolean`, `null`) clones are skipped because primitives are immutable on the JS side, making `Layer<number>` etc. zero-allocation across reads and writes. `forEachReadOnly(cb)` is an explicit zero-allocation read path for object `T` consumers who own the no-mutate discipline. Layers are JSON-serializable through `getState()` / `Layer.fromState()` and value writes are validated via `assertJsonCompatible`. Layers are independent of `World`; game code instantiates and ticks them from systems. They are a sibling utility to `OccupancyGrid` and `VisibilityMap` ╞Æ?" the engine does not own per-game field data, only the data structure.
- **Pathfinding** is a standalone utility. It has no knowledge of the spatial grid, entities, or the tick loop. Game code provides `neighbors`, `cost`, `heuristic`, and `hash` callbacks to wire it to any graph topology.
- **Path Service** is a standalone utility built on top of `findPath`. It provides `findGridPath`, `PathCache`, `PathRequestQueue`, and `createGridPathQueue` for deterministic batched path processing.
- **VisibilityMap** is a standalone utility. It tracks per-player visible and explored cells and remains independent of rendering and UI code.
- **WorldDebugger** is a standalone inspection utility. It captures structured summaries of world state, metrics, events, last-diff data, and custom probe output for standalone utilities such as occupancy, visibility, and path queues.
- **ScenarioRunner** is a standalone orchestration utility. It pairs prepared setup, deterministic stepping, checks, debugger output, and short-horizon history into one machine-readable result for AI agents and harnesses.
- **BehaviorTree** is a standalone utility. It has no knowledge of World, entities, or the tick loop. Game code defines tree structure via `createBehaviorTree`, stores `BTState` as a component, and ticks trees from a system. The `TContext` generic is game-defined ╞Æ?" the engine does not prescribe what context contains beyond a BTState accessor. Reactive variants (`reactiveSelector`, `reactiveSequence`) re-evaluate from the root each tick without persisting running state; `clearRunningState` provides imperative subtree resets.
- **ClientAdapter** reads World state and subscribes to diffs. It does not modify World internals directly ╞Æ?" it uses only the public API (`serialize`, `onDiff`/`offDiff`, `getEvents`, `submitWithResult`).
- **World State** is owned by World as a private Map. Systems read/write via `world.setState()`/`world.getState()`. State is non-entity structured data (terrain config, simulation time, etc.). Typed against the `TState` generic on `World` (default `Record<string, unknown>`) ╞Æ?" independent of the `TComponents` registry. Included in serialization and diffs.
- **Tags & Metadata** are owned by World. Tags are string labels with reverse-index lookup via `world.getByTag()`. Metadata is key-value per entity with unique reverse-index via `world.getByMeta()` ╞Æ?" `setMeta` throws if another live entity already owns the `(key, value)` pair. Both cleaned up on entity destruction; the cleanup is reflected in `TickDiff.tags`/`TickDiff.metadata` as `{ entity, tags: [] }` / `{ entity, meta: {} }`.
- **System Ordering** supports optional `before`/`after` named constraints in `SystemRegistration`. Constraints resolve via topological sort within each phase at first tick (or after dynamic registration). Cross-phase constraints are errors.
- **Session Recording** is a dedicated subsystem (`src/session-recorder.ts`, `src/session-replayer.ts`, `src/session-bundle.ts`, `src/session-sink.ts`, `src/session-file-sink.ts`, `src/session-scenario-bundle.ts`, `src/session-errors.ts`) that captures deterministic, replayable bundles of any World run. Per ADR 1, it runs as a sibling to `WorldHistoryRecorder` rather than extending it ╞Æ?" the two recorders have different shapes (rolling debug buffer vs. persistent archive) and different consumers. `WorldHistoryRecorder` continues to serve in-process debugging; `SessionRecorder` is for archive + replay. **Mutex:** payload-capturing recorders (any `SessionRecorder`, OR `WorldHistoryRecorder({ captureCommandPayloads: true })`) are mutually exclusive on a given world (one wrap on `submitWithResult` per world); default-config `WorldHistoryRecorder` instances compose freely. The `world.__payloadCapturingRecorder` slot enforces this. **Replay** uses the `World.applySnapshot(snap)` instance method (added in T0 of the implementation): `worldFactory` must register components/handlers on a fresh world, then call `applySnapshot` in-place ╞Æ?" `World.deserialize` would conflict with subsequent re-registration. Replay across recorded `TickFailure` is out of scope for v1 (`WorldSnapshotV5` doesn't carry poison state); future spec extends to v6. **Determinism contract** (spec A11) is documented but NOT structurally enforced; `SessionReplayer.selfCheck()` is the verification mechanism. See `docs/guides/session-recording.md` for the user-facing guide.
System.Management.Automation.RemoteException
## Technology Map
System.Management.Automation.RemoteException
| Technology                     | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| TypeScript 5.7+                | Language (strict mode, ES2022, ESM, Node16 module resolution) |
| Vitest 3                       | Test framework                                                |
| ESLint 9 + typescript-eslint 8 | Linting (flat config)                                         |
| Node.js 18+                    | Runtime                                                       |
System.Management.Automation.RemoteException
For architectural decisions, see `docs/architecture/decisions.md`.
For architecture drift history, see `docs/architecture/drift-log.md`.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:20:30.281653Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:20:30.282178Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
IΓÇÖve confirmed the current repo state docs, and thereΓÇÖs already one environment-level risk: plain `git` commands fail here on `safe.directory`, so any plan step that assumes `git add/diff/commit` just works is not robust as written. Next IΓÇÖm checking the concrete session-recording and metrics APIs to see whether the proposed code and tests actually line up with the current types.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\index.ts" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\session-bundle.ts" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\session-file-sink.ts" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\behavioral-metrics.ts" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 539ms:
import type { TickDiff } from './diff.js';
import type { JsonValue } from './json.js';
import type { WorldSnapshot } from './serializer.js';
import type { Position } from './types.js';
import type {
  CommandExecutionResult,
  CommandSubmissionResult,
  TickFailure,
  WorldMetrics,
} from './world.js';
System.Management.Automation.RemoteException
export const SESSION_BUNDLE_SCHEMA_VERSION = 1 as const;
System.Management.Automation.RemoteException
export type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
export type MarkerProvenance = 'engine' | 'game';
System.Management.Automation.RemoteException
export interface EntityRef {
  id: number;
  generation: number;
}
System.Management.Automation.RemoteException
export interface MarkerRefs {
  entities?: EntityRef[];
  cells?: Position[];
  tickRange?: { from: number; to: number };
}
System.Management.Automation.RemoteException
export interface Marker {
  id: string;
  tick: number;
  kind: MarkerKind;
  provenance: MarkerProvenance;
  text?: string;
  refs?: MarkerRefs;
  data?: JsonValue;
  attachments?: string[];
  createdAt?: string;
  validated?: false;
}
System.Management.Automation.RemoteException
export interface RecordedCommand<TCommandMap = Record<string, unknown>> {
  submissionTick: number;
  sequence: number;
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
  result: CommandSubmissionResult<keyof TCommandMap>;
}
System.Management.Automation.RemoteException
export interface SessionTickEntry<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  tick: number;
  diff: TickDiff;
  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
  metrics: WorldMetrics | null;
  debug: TDebug | null;
}
System.Management.Automation.RemoteException
export interface SessionSnapshotEntry {
  tick: number;
  snapshot: WorldSnapshot;
}
System.Management.Automation.RemoteException
export interface AttachmentDescriptor {
  id: string;
  mime: string;
  sizeBytes: number;
  /**
   * Storage policy for the attachment. Sinks finalize this on `writeAttachment`:
   * - `{ dataUrl: '...' }`: bytes embedded in the manifest as `data:<mime>;base64,...`.
   *   Caller passing `{ dataUrl: '' }` opts into manifest embedding; sink populates the URL.
   * - `{ sidecar: true }`: bytes stored externally (FileSink: `attachments/<id>.<ext>`;
   *   MemorySink: parallel internal Map accessed via `source.readSidecar(id)`).
   * - `{ auto: true }`: caller has no preference; each sink applies its own default
   *   (FileSink ╞Æ+' sidecar; MemorySink ╞Æ+' dataUrl under threshold, sidecar over with
   *   `allowSidecar: true`, otherwise throw). The `SessionRecorder.attach()` API
   *   uses `auto` when caller didn't pass `options.sidecar`.
   */
  ref: { dataUrl: string } | { sidecar: true } | { auto: true };
}
System.Management.Automation.RemoteException
export interface SessionMetadata {
  sessionId: string;
  engineVersion: string;
  nodeVersion: string;
  recordedAt: string;
  startTick: number;
  endTick: number;
  persistedEndTick: number;
  durationTicks: number;
  /**
   * 'synthetic' added in v0.8.0 (Spec 3 T2). Widening from 'session' | 'scenario'
   * is a breaking change for downstream `assertNever`-style exhaustive switches;
   * b-bump per AGENTS.md. See ADR 20 in docs/architecture/decisions.md.
   */
  sourceKind: 'session' | 'scenario' | 'synthetic';
  sourceLabel?: string;
  incomplete?: true;
  failedTicks?: number[];
  /**
   * Populated only when sourceKind === 'synthetic'. The seed used for the
   * harness's policy sub-RNG; preserved for future replay-via-policy work.
   * Spec 3 A5.4.
   */
  policySeed?: number;
}
System.Management.Automation.RemoteException
export interface SessionBundle<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  initialSnapshot: WorldSnapshot;
  ticks: SessionTickEntry<TEventMap, TDebug>[];
  commands: RecordedCommand<TCommandMap>[];
  executions: CommandExecutionResult<keyof TCommandMap>[];
  failures: TickFailure[];
  snapshots: SessionSnapshotEntry[];
  markers: Marker[];
  attachments: AttachmentDescriptor[];
}
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 658ms:
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertJsonCompatible, bytesToBase64 } from './json.js';
import type { WorldSnapshot } from './serializer.js';
import type {
  AttachmentDescriptor,
  Marker,
  RecordedCommand,
  SessionBundle,
  SessionMetadata,
  SessionSnapshotEntry,
  SessionTickEntry,
} from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import { SinkWriteError } from './session-errors.js';
import type { SessionSink, SessionSource } from './session-sink.js';
import type { CommandExecutionResult, TickFailure } from './world.js';
System.Management.Automation.RemoteException
const TICKS_FILE = 'ticks.jsonl';
const COMMANDS_FILE = 'commands.jsonl';
const EXECUTIONS_FILE = 'executions.jsonl';
const FAILURES_FILE = 'failures.jsonl';
const MARKERS_FILE = 'markers.jsonl';
const MANIFEST_FILE = 'manifest.json';
const MANIFEST_TMP_FILE = 'manifest.tmp.json';
const SNAPSHOTS_DIR = 'snapshots';
const ATTACHMENTS_DIR = 'attachments';
System.Management.Automation.RemoteException
/**
 * Map a MIME type to a file extension for sidecar attachments. Falls back
 * to `.bin` when the MIME isn't recognized ╞Æ?" readers can recover the
 * original MIME from the manifest's `AttachmentDescriptor`, so the
 * extension is purely for human convenience.
 */
const MIME_EXT_TABLE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/json': '.json',
  'application/octet-stream': '.bin',
  'text/plain': '.txt',
  'text/csv': '.csv',
};
System.Management.Automation.RemoteException
function extForMime(mime: string): string {
  return MIME_EXT_TABLE[mime] ?? '.bin';
}
System.Management.Automation.RemoteException
interface FileManifest {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  attachments: AttachmentDescriptor[];
}
System.Management.Automation.RemoteException
/**
 * On-disk session sink + source. Layout (per spec A5.2):
 *
 * ```
 * <bundleDir>/
 *   manifest.json                      # SessionMetadata + dataUrl attachments + sidecar refs
 *   ticks.jsonl                        # one SessionTickEntry per line
 *   commands.jsonl                     # one RecordedCommand per line
 *   executions.jsonl                   # one CommandExecutionResult per line
 *   failures.jsonl                     # one TickFailure per line
 *   markers.jsonl                      # one Marker per line
 *   snapshots/<tick>.json              # one snapshot per file
 *   attachments/<id>.<ext>             # sidecar bytes
 * ```
 *
 * **Default attachment policy: sidecar.** FileSink is disk-backed; storing
 * blobs as files matches the storage model. Pass `descriptor.ref:
 * { dataUrl: '<placeholder>' }` to opt into manifest embedding for very
 * small blobs only.
 *
 * **Manifest cadence (atomic via .tmp.json rename):** rewritten on `open()`
 * (initial), on each successful `writeSnapshot()` (so a crash mid-run leaves
 * the manifest pointing at the last persisted snapshot tick), and on
 * `close()` (final). Per-tick manifest rewrites are NOT performed.
 */
export class FileSink implements SessionSink, SessionSource {
  private readonly _dir: string;
  private _metadata: SessionMetadata | null = null;
  private readonly _attachments: AttachmentDescriptor[] = [];
  private _closed = false;
System.Management.Automation.RemoteException
  constructor(bundleDir: string) {
    this._dir = bundleDir;
    // Cross-process reload: if the directory already contains a manifest,
    // load metadata + attachments from it so the FileSink can be used as
    // a SessionSource without going through `open()` first. The user can
    // call `toBundle()` / `readSnapshot()` / `readSidecar()` directly.
    // If they later call `open()` to start a new recording on the same dir,
    // the manifest is rewritten. Iter-1 code review fix (Codex C1).
    const manifestPath = join(this._dir, MANIFEST_FILE);
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as FileManifest;
        if (manifest.schemaVersion === SESSION_BUNDLE_SCHEMA_VERSION) {
          this._metadata = { ...manifest.metadata };
          this._attachments.push(...manifest.attachments);
        }
      } catch {
        // Manifest unreadable ╞Æ?" leave _metadata null; constructor doesn't throw.
        // open() will rewrite if/when called.
      }
    }
  }
System.Management.Automation.RemoteException
  get metadata(): SessionMetadata {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened', { code: 'not_opened' });
    }
    return this._metadata;
  }
System.Management.Automation.RemoteException
  open(metadata: SessionMetadata): void {
    if (this._closed) {
      throw new SinkWriteError('sink already closed', { code: 'already_closed' });
    }
    if (!existsSync(this._dir)) {
      mkdirSync(this._dir, { recursive: true });
    }
    if (!existsSync(join(this._dir, SNAPSHOTS_DIR))) {
      mkdirSync(join(this._dir, SNAPSHOTS_DIR), { recursive: true });
    }
    if (!existsSync(join(this._dir, ATTACHMENTS_DIR))) {
      mkdirSync(join(this._dir, ATTACHMENTS_DIR), { recursive: true });
    }
    // Touch the JSONL streams (create empty files if missing).
    for (const f of [TICKS_FILE, COMMANDS_FILE, EXECUTIONS_FILE, FAILURES_FILE, MARKERS_FILE]) {
      const p = join(this._dir, f);
      if (!existsSync(p)) writeFileSync(p, '');
    }
    // open() resets in-memory state to match the new recording's metadata.
    // (The constructor may have pre-loaded a previous bundle's manifest for
    // cross-process read access.)
    this._metadata = { ...metadata };
    this._attachments.length = 0;
    this._writeManifest();
  }
System.Management.Automation.RemoteException
  private _assertOpen(): void {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened', { code: 'not_opened' });
    }
    if (this._closed) {
      throw new SinkWriteError('sink already closed', { code: 'already_closed' });
    }
  }
System.Management.Automation.RemoteException
  private _writeManifest(): void {
    if (!this._metadata) return;
    const manifest: FileManifest = {
      schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
      metadata: { ...this._metadata },
      attachments: this._attachments.slice(),
    };
    const tmp = join(this._dir, MANIFEST_TMP_FILE);
    const final = join(this._dir, MANIFEST_FILE);
    try {
      writeFileSync(tmp, JSON.stringify(manifest, null, 2));
      renameSync(tmp, final);
    } catch (e) {
      // Clean up partial tmp on failure
      if (existsSync(tmp)) {
        try { rmSync(tmp, { force: true }); } catch { /* swallow */ }
      }
      throw new SinkWriteError(`manifest write failed: ${(e as Error).message}`, { code: 'manifest_write' });
    }
  }
System.Management.Automation.RemoteException
  private _appendJsonl(file: string, value: unknown): void {
    try {
      appendFileSync(join(this._dir, file), JSON.stringify(value) + '\n');
    } catch (e) {
      throw new SinkWriteError(`append to ${file} failed: ${(e as Error).message}`, {
        code: 'jsonl_append', file,
      });
    }
  }
System.Management.Automation.RemoteException
  private _readJsonlLines(file: string): unknown[] {
    const path = join(this._dir, file);
    if (!existsSync(path)) return [];
    const raw = readFileSync(path, 'utf-8');
    if (raw.length === 0) return [];
    const lines = raw.split('\n');
    const out: unknown[] = [];
    for (const line of lines) {
      if (line.length === 0) continue;
      try {
        out.push(JSON.parse(line));
      } catch (e) {
        // Tolerate trailing partial line (e.g. from a crash mid-write).
        // A clean recorder always terminates lines with \n; if the LAST
        // line is malformed, skip it. Internal lines are required to be
        // well-formed.
        if (line === lines[lines.length - 1]) {
          continue;
        }
        throw new SinkWriteError(`malformed JSONL in ${file}: ${(e as Error).message}`, {
          code: 'jsonl_parse', file,
        });
      }
    }
    return out;
  }
System.Management.Automation.RemoteException
  writeTick(entry: SessionTickEntry): void {
    this._assertOpen();
    assertJsonCompatible(entry, 'session tick entry');
    this._appendJsonl(TICKS_FILE, entry);
  }
System.Management.Automation.RemoteException
  writeCommand(record: RecordedCommand): void {
    this._assertOpen();
    assertJsonCompatible(record, 'recorded command');
    this._appendJsonl(COMMANDS_FILE, record);
  }
System.Management.Automation.RemoteException
  writeCommandExecution(result: CommandExecutionResult): void {
    this._assertOpen();
    assertJsonCompatible(result, 'command execution result');
    this._appendJsonl(EXECUTIONS_FILE, result);
  }
System.Management.Automation.RemoteException
  writeTickFailure(failure: TickFailure): void {
    this._assertOpen();
    assertJsonCompatible(failure, 'tick failure');
    this._appendJsonl(FAILURES_FILE, failure);
    if (this._metadata) {
      this._metadata.failedTicks = [...(this._metadata.failedTicks ?? []), failure.tick];
    }
  }
System.Management.Automation.RemoteException
  writeSnapshot(entry: SessionSnapshotEntry): void {
    this._assertOpen();
    assertJsonCompatible(entry, 'snapshot entry');
    const path = join(this._dir, SNAPSHOTS_DIR, `${entry.tick}.json`);
    try {
      writeFileSync(path, JSON.stringify(entry, null, 2));
    } catch (e) {
      throw new SinkWriteError(`snapshot write failed: ${(e as Error).message}`, {
        code: 'snapshot_write', tick: entry.tick,
      });
    }
    if (this._metadata) {
      this._metadata.persistedEndTick = entry.tick;
    }
    this._writeManifest();
  }
System.Management.Automation.RemoteException
  writeMarker(marker: Marker): void {
    this._assertOpen();
    assertJsonCompatible(marker, 'marker');
    this._appendJsonl(MARKERS_FILE, marker);
  }
System.Management.Automation.RemoteException
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor {
    this._assertOpen();
    // FileSink default for 'auto' (no caller preference): sidecar ╞Æ?" disk-backed
    // sink keeps blobs as files. Caller opts into manifest embedding via
    // explicit ref: { dataUrl: <any-string> }.
    const explicitDataUrl = 'dataUrl' in descriptor.ref;
    let final: AttachmentDescriptor;
    if (explicitDataUrl) {
      const b64 = bytesToBase64(data);
      final = {
        id: descriptor.id, mime: descriptor.mime, sizeBytes: descriptor.sizeBytes,
        ref: { dataUrl: `data:${descriptor.mime};base64,${b64}` },
      };
    } else {
      const ext = extForMime(descriptor.mime);
      const path = join(this._dir, ATTACHMENTS_DIR, `${descriptor.id}${ext}`);
      try {
        writeFileSync(path, data);
      } catch (e) {
        throw new SinkWriteError(`attachment write failed: ${(e as Error).message}`, {
          code: 'attachment_write', id: descriptor.id,
        });
      }
      final = {
        id: descriptor.id, mime: descriptor.mime, sizeBytes: descriptor.sizeBytes,
        ref: { sidecar: true },
      };
    }
    this._attachments.push(final);
    this._writeManifest();
    return final;
  }
System.Management.Automation.RemoteException
  close(): void {
    if (this._closed) return;
    this._writeManifest();  // final manifest with terminal endTick + clean state
    this._closed = true;
  }
System.Management.Automation.RemoteException
  // --- SessionSource ---
System.Management.Automation.RemoteException
  readSnapshot(tick: number): WorldSnapshot {
    const path = join(this._dir, SNAPSHOTS_DIR, `${tick}.json`);
    if (!existsSync(path)) {
      throw new SinkWriteError(`snapshot at tick ${tick} not found`, {
        code: 'snapshot_missing', tick,
      });
    }
    try {
      const raw = readFileSync(path, 'utf-8');
      const entry = JSON.parse(raw) as SessionSnapshotEntry;
      return entry.snapshot;
    } catch (e) {
      throw new SinkWriteError(`snapshot read failed: ${(e as Error).message}`, {
        code: 'snapshot_read', tick,
      });
    }
  }
System.Management.Automation.RemoteException
  readSidecar(id: string): Uint8Array {
    const desc = this._attachments.find((a) => a.id === id);
    if (!desc) {
      throw new SinkWriteError(`sidecar ${id} not found in attachments index`, {
        code: 'sidecar_missing', id,
      });
    }
    if (!('sidecar' in desc.ref)) {
      throw new SinkWriteError(`attachment ${id} is not a sidecar (it's a dataUrl)`, {
        code: 'sidecar_wrong_kind', id,
      });
    }
    const ext = extForMime(desc.mime);
    const path = join(this._dir, ATTACHMENTS_DIR, `${id}${ext}`);
    if (!existsSync(path)) {
      throw new SinkWriteError(`sidecar ${id} file missing on disk`, {
        code: 'sidecar_file_missing', id, path,
      });
    }
    const buf = readFileSync(path);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
System.Management.Automation.RemoteException
  *ticks(): IterableIterator<SessionTickEntry> {
    for (const line of this._readJsonlLines(TICKS_FILE)) yield line as SessionTickEntry;
  }
  *commands(): IterableIterator<RecordedCommand> {
    for (const line of this._readJsonlLines(COMMANDS_FILE)) yield line as RecordedCommand;
  }
  *executions(): IterableIterator<CommandExecutionResult> {
    for (const line of this._readJsonlLines(EXECUTIONS_FILE)) yield line as CommandExecutionResult;
  }
  *failures(): IterableIterator<TickFailure> {
    for (const line of this._readJsonlLines(FAILURES_FILE)) yield line as TickFailure;
  }
  *markers(): IterableIterator<Marker> {
    for (const line of this._readJsonlLines(MARKERS_FILE)) yield line as Marker;
  }
  *attachments(): IterableIterator<AttachmentDescriptor> {
    for (const a of this._attachments) yield a;
  }
System.Management.Automation.RemoteException
  toBundle(): SessionBundle {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened; cannot build bundle', { code: 'not_opened' });
    }
    // Read all snapshots from disk
    const snapshots: SessionSnapshotEntry[] = [];
    const snapshotsDir = join(this._dir, SNAPSHOTS_DIR);
    if (existsSync(snapshotsDir)) {
      const files = readdirSync(snapshotsDir).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        const tick = Number.parseInt(f.replace('.json', ''), 10);
        if (Number.isFinite(tick)) {
          const raw = readFileSync(join(snapshotsDir, f), 'utf-8');
          snapshots.push(JSON.parse(raw) as SessionSnapshotEntry);
        }
      }
      snapshots.sort((a, b) => a.tick - b.tick);
    }
    if (snapshots.length === 0) {
      throw new SinkWriteError(
        'no snapshots written; cannot build bundle',
        { code: 'no_snapshots' },
      );
    }
    return {
      schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
      metadata: { ...this._metadata },
      initialSnapshot: snapshots[0].snapshot,
      ticks: [...this.ticks()] as SessionBundle['ticks'],
      commands: [...this.commands()] as unknown as SessionBundle['commands'],
      executions: [...this.executions()] as SessionBundle['executions'],
      failures: [...this.failures()],
      snapshots: snapshots.slice(1),
      markers: [...this.markers()],
      attachments: this._attachments.slice(),
    };
  }
}
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 774ms:
export * from './ai-contract.js';
export * from './behavior-tree.js';
export * from './cellular.js';
export * from './client-adapter.js';
export * from './command-transaction.js';
export * from './diff.js';
export * from './history-recorder.js';
export * from './layer.js';
export * from './map-gen.js';
export * from './noise.js';
export * from './occupancy-grid.js';
export * from './path-service.js';
export * from './pathfinding.js';
export * from './random.js';
export * from './render-adapter.js';
export * from './resource-store.js';
export * from './scenario-runner.js';
export * from './serializer.js';
export * from './spatial-grid.js';
export * from './types.js';
export * from './visibility-map.js';
export * from './world.js';
export * from './world-debugger.js';
System.Management.Automation.RemoteException
// Session-recording subsystem (T1+; see docs/design/2026-04-26-session-recording-and-replay-design.md)
export {
  SESSION_BUNDLE_SCHEMA_VERSION,
  type SessionBundle,
  type SessionMetadata,
  type SessionTickEntry,
  type SessionSnapshotEntry,
  type AttachmentDescriptor,
  type RecordedCommand,
  type Marker,
  type MarkerKind,
  type MarkerProvenance,
  type MarkerRefs,
  type EntityRef,
} from './session-bundle.js';
export {
  SessionRecordingError,
  MarkerValidationError,
  RecorderClosedError,
  SinkWriteError,
  BundleVersionError,
  BundleRangeError,
  BundleIntegrityError,
  ReplayHandlerMissingError,
} from './session-errors.js';
// Side-effect import: declaration-merge for hidden World.__payloadCapturingRecorder slot
import './session-internals.js';
export { ENGINE_VERSION } from './version.js';
// T2: Session sinks
export {
  type SessionSink,
  type SessionSource,
  MemorySink,
  type MemorySinkOptions,
} from './session-sink.js';
// T3: FileSink
export { FileSink } from './session-file-sink.js';
// T5: SessionRecorder
export {
  SessionRecorder,
  type SessionRecorderConfig,
  type NewMarker,
} from './session-recorder.js';
// T6: SessionReplayer + selfCheck
export {
  SessionReplayer,
  type ReplayerConfig,
  type SelfCheckOptions,
  type SelfCheckResult,
  type StateDivergence,
  type EventDivergence,
  type ExecutionDivergence,
  type SkippedSegment,
  type MarkerValidationResult,
  deepEqualWithPath,
} from './session-replayer.js';
// T7: scenarioResultToBundle adapter
export {
  scenarioResultToBundle,
  type ScenarioResultToBundleOptions,
} from './session-scenario-bundle.js';
// Behavioral Metrics over Corpus ╞Æ?" Spec 8 (v0.8.2+): pure-function corpus reducer
// over Iterable<SessionBundle>. 11 engine-generic built-in metrics + accumulator-style
// Metric contract + thin compareMetricsResults delta helper.
export {
  type Metric,
  type MetricsResult,
  type MetricsComparison,
  type MetricDelta,
  type NumericDelta,
  type OpaqueDelta,
  type OnlyInComparison,
  type Stats,
  runMetrics,
  compareMetricsResults,
  bundleCount,
  sessionLengthStats,
  commandRateStats,
  eventRateStats,
  commandTypeCounts,
  eventTypeCounts,
  failureBundleRate,
  failedTickRate,
  incompleteBundleRate,
  commandValidationAcceptanceRate,
  executionFailureRate,
} from './behavioral-metrics.js';
System.Management.Automation.RemoteException
// Synthetic Playtest ╞Æ?" Spec 3 T1+T2 (v0.7.20+): Policy types, 3 built-in policies, runSynthPlaytest harness.
export {
  type Policy,
  type PolicyContext,
  type StopContext,
  type PolicyCommand,
  type RandomPolicyConfig,
  type ScriptedPolicyEntry,
  type SynthPlaytestConfig,
  type SynthPlaytestResult,
  noopPolicy,
  randomPolicy,
  scriptedPolicy,
  runSynthPlaytest,
} from './synthetic-playtest.js';
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 931ms:
import type { SessionBundle } from './session-bundle.js';
import type { JsonValue } from './json.js';
System.Management.Automation.RemoteException
export interface Stats {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}
System.Management.Automation.RemoteException
export interface Metric<
  TState,
  TResult,
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  readonly name: string;
  create(): TState;
  observe(state: TState, bundle: SessionBundle<TEventMap, TCommandMap, TDebug>): TState;
  finalize(state: TState): TResult;
  merge?(a: TState, b: TState): TState;
  readonly orderSensitive?: boolean;
}
System.Management.Automation.RemoteException
export type MetricsResult = Record<string, unknown>;
System.Management.Automation.RemoteException
export function runMetrics<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
>(
  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
  metrics: Metric<unknown, unknown>[],
): MetricsResult {
  const names = new Set<string>();
  for (const m of metrics) {
    if (names.has(m.name)) {
      throw new RangeError(`duplicate metric name: ${m.name}`);
    }
    names.add(m.name);
  }
  const states: unknown[] = metrics.map((m) => m.create());
  for (const bundle of bundles) {
    for (let i = 0; i < metrics.length; i++) {
      states[i] = metrics[i].observe(states[i], bundle as unknown as SessionBundle);
    }
  }
  const result: MetricsResult = {};
  for (let i = 0; i < metrics.length; i++) {
    result[metrics[i].name] = metrics[i].finalize(states[i]);
  }
  return result;
}
System.Management.Automation.RemoteException
function computeStats(values: number[]): Stats {
  const count = values.length;
  if (count === 0) {
    return { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[count - 1];
  const mean = sorted.reduce((s, v) => s + v, 0) / count;
  const percentile = (p: number): number => {
    if (count === 1) return sorted[0];
    const idx = (count - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    count, min, max, mean,
    p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99),
  };
}
System.Management.Automation.RemoteException
export function bundleCount(name: string = 'bundleCount'): Metric<{ count: number }, number> {
  return {
    name,
    create: () => ({ count: 0 }),
    observe: (state) => {
      state.count++;
      return state;
    },
    finalize: (state) => state.count,
  };
}
System.Management.Automation.RemoteException
export function sessionLengthStats(name: string = 'sessionLengthStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      state.push(bundle.metadata.durationTicks);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}
System.Management.Automation.RemoteException
export function commandRateStats(name: string = 'commandRateStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      const ticks = bundle.metadata.durationTicks;
      state.push(ticks > 0 ? bundle.commands.length / ticks : 0);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}
System.Management.Automation.RemoteException
export function eventRateStats(name: string = 'eventRateStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      const ticks = bundle.metadata.durationTicks;
      let totalEvents = 0;
      for (const t of bundle.ticks) totalEvents += t.events.length;
      state.push(ticks > 0 ? totalEvents / ticks : 0);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}
System.Management.Automation.RemoteException
// Sort keys at finalize so the resulting Record has a serialization-stable
// iteration order. Different bundle orders ╞Æ+' same Map content but different
// insertion order ╞Æ+' without sorting, JSON.stringify produces different strings,
// causing baseline-file churn even when counts are identical. Sorting closes
// that gap.
function sortedRecordFromMap(state: Map<string, number>): Record<string, number> {
  const keys = [...state.keys()].sort();
  const obj: Record<string, number> = {};
  for (const k of keys) obj[k] = state.get(k) as number;
  return obj;
}
System.Management.Automation.RemoteException
export function commandTypeCounts(
  name: string = 'commandTypeCounts',
): Metric<Map<string, number>, Record<string, number>> {
  return {
    name,
    create: () => new Map(),
    observe: (state, bundle) => {
      for (const cmd of bundle.commands) {
        state.set(cmd.type, (state.get(cmd.type) ?? 0) + 1);
      }
      return state;
    },
    finalize: sortedRecordFromMap,
  };
}
System.Management.Automation.RemoteException
export function eventTypeCounts(
  name: string = 'eventTypeCounts',
): Metric<Map<string, number>, Record<string, number>> {
  return {
    name,
    create: () => new Map(),
    observe: (state, bundle) => {
      for (const tickEntry of bundle.ticks) {
        for (const ev of tickEntry.events) {
          const key = String(ev.type);
          state.set(key, (state.get(key) ?? 0) + 1);
        }
      }
      return state;
    },
    finalize: sortedRecordFromMap,
  };
}
System.Management.Automation.RemoteException
export function failureBundleRate(
  name: string = 'failureBundleRate',
): Metric<{ withFailure: number; total: number }, number> {
  return {
    name,
    create: () => ({ withFailure: 0, total: 0 }),
    observe: (state, bundle) => {
      state.total++;
      if ((bundle.metadata.failedTicks?.length ?? 0) > 0) state.withFailure++;
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.withFailure / state.total : 0),
  };
}
System.Management.Automation.RemoteException
export function failedTickRate(
  name: string = 'failedTickRate',
): Metric<{ failedTicks: number; durationTicks: number }, number> {
  return {
    name,
    create: () => ({ failedTicks: 0, durationTicks: 0 }),
    observe: (state, bundle) => {
      state.failedTicks += bundle.metadata.failedTicks?.length ?? 0;
      state.durationTicks += bundle.metadata.durationTicks;
      return state;
    },
    finalize: (state) => (state.durationTicks > 0 ? state.failedTicks / state.durationTicks : 0),
  };
}
System.Management.Automation.RemoteException
export function incompleteBundleRate(
  name: string = 'incompleteBundleRate',
): Metric<{ incomplete: number; total: number }, number> {
  return {
    name,
    create: () => ({ incomplete: 0, total: 0 }),
    observe: (state, bundle) => {
      state.total++;
      if (bundle.metadata.incomplete === true) state.incomplete++;
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.incomplete / state.total : 0),
  };
}
System.Management.Automation.RemoteException
export function commandValidationAcceptanceRate(
  name: string = 'commandValidationAcceptanceRate',
): Metric<{ accepted: number; total: number }, number> {
  return {
    name,
    create: () => ({ accepted: 0, total: 0 }),
    observe: (state, bundle) => {
      for (const cmd of bundle.commands) {
        state.total++;
        if (cmd.result.accepted) state.accepted++;
      }
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.accepted / state.total : 0),
  };
}
System.Management.Automation.RemoteException
export function executionFailureRate(
  name: string = 'executionFailureRate',
): Metric<{ failed: number; total: number }, number> {
  return {
    name,
    create: () => ({ failed: 0, total: 0 }),
    observe: (state, bundle) => {
      for (const exec of bundle.executions) {
        state.total++;
        if (!exec.executed) state.failed++;
      }
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.failed / state.total : 0),
  };
}
System.Management.Automation.RemoteException
export type NumericDelta = {
  baseline: number | null;
  current: number | null;
  delta: number | null;
  pctChange: number | null;
};
System.Management.Automation.RemoteException
export type OpaqueDelta = {
  baseline: unknown;
  current: unknown;
  equal: boolean;
};
System.Management.Automation.RemoteException
export type OnlyInComparison = {
  baseline?: unknown;
  current?: unknown;
  onlyIn: 'baseline' | 'current';
};
System.Management.Automation.RemoteException
export type MetricDelta =
  | NumericDelta
  | OpaqueDelta
  | { [key: string]: MetricDelta | OnlyInComparison };
System.Management.Automation.RemoteException
export type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;
System.Management.Automation.RemoteException
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
System.Management.Automation.RemoteException
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}
System.Management.Automation.RemoteException
function compareValue(baseline: unknown, current: unknown): MetricDelta {
  if (
    (typeof baseline === 'number' || baseline === null) &&
    (typeof current === 'number' || current === null)
  ) {
    if (baseline === null || current === null) {
      return { baseline, current, delta: null, pctChange: null };
    }
    const delta = current - baseline;
    let pctChange: number | null;
    if (baseline === 0) {
      pctChange = current === 0 ? 0 : current > 0 ? Infinity : -Infinity;
    } else {
      pctChange = (current - baseline) / baseline;
    }
    return { baseline, current, delta, pctChange };
  }
  if (isPlainObject(baseline) && isPlainObject(current)) {
    const out: Record<string, MetricDelta | OnlyInComparison> = {};
    const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
    for (const k of allKeys) {
      const inB = k in baseline;
      const inC = k in current;
      if (inB && inC) {
        out[k] = compareValue(baseline[k], current[k]);
      } else if (inB) {
        out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
      } else {
        out[k] = { current: current[k], onlyIn: 'current' };
      }
    }
    return out;
  }
  return { baseline, current, equal: deepEqual(baseline, current) };
}
System.Management.Automation.RemoteException
export function compareMetricsResults(
  baseline: MetricsResult,
  current: MetricsResult,
): MetricsComparison {
  const out: MetricsComparison = {};
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const k of allKeys) {
    const inB = k in baseline;
    const inC = k in current;
    if (inB && inC) {
      out[k] = compareValue(baseline[k], current[k]);
    } else if (inB) {
      out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
    } else {
      out[k] = { current: current[k], onlyIn: 'current' };
    }
  }
  return out;
}
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:20:46.328339Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:20:46.330448Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\session-sink.ts" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\session-errors.ts" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content package.json' in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\version.ts" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 648ms:
{
  "name": "civ-engine",
  "version": "0.8.2",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "docs"
  ],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "benchmark:rts": "npm run build && node scripts/rts-benchmark.mjs",
    "debug:client": "npm run build && node scripts/serve-debug-client.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests --no-error-on-unmatched-pattern",
    "typecheck": "tsc"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@types/node": "^25.6.0",
    "eslint": "^9.0.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^3.0.0"
  }
}
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 857ms:
import { assertJsonCompatible, bytesToBase64 } from './json.js';
import type { WorldSnapshot } from './serializer.js';
import type {
  AttachmentDescriptor,
  Marker,
  RecordedCommand,
  SessionBundle,
  SessionMetadata,
  SessionSnapshotEntry,
  SessionTickEntry,
} from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import { SinkWriteError } from './session-errors.js';
import type { CommandExecutionResult, TickFailure } from './world.js';
System.Management.Automation.RemoteException
/**
 * Synchronous write interface for session-recording sinks. The
 * `SessionRecorder` (T5) calls these methods from its `World` listener
 * callbacks; per spec A8 v1 sinks are synchronous to compose with the
 * engine's synchronous listener invariants.
 */
export interface SessionSink {
  open(metadata: SessionMetadata): void;
  writeTick(entry: SessionTickEntry): void;
  writeCommand(record: RecordedCommand): void;
  writeCommandExecution(result: CommandExecutionResult): void;
  writeTickFailure(failure: TickFailure): void;
  writeSnapshot(entry: SessionSnapshotEntry): void;
  writeMarker(marker: Marker): void;
  /**
   * Stores the attachment bytes per the requested `descriptor.ref` policy
   * (`{ dataUrl }` ╞Æ+' embed in manifest as base64 data URL; `{ sidecar: true }`
   * ╞Æ+' store bytes externally). Returns the FINAL descriptor with `ref`
   * resolved (sinks may rewrite `dataUrl` placeholder values to populated
   * data URLs, or downgrade dataUrl to sidecar if the sink does not embed).
   * Recorders MUST use the returned descriptor as the source of truth.
   */
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor;
  close(): void;
}
System.Management.Automation.RemoteException
/**
 * Read interface paired with `SessionSink`. Both `MemorySink` and `FileSink`
 * implement the union (`SessionSink & SessionSource`). The `SessionReplayer`
 * (T6) consumes a `SessionSource` to rehydrate bundle data lazily.
 */
export interface SessionSource {
  readonly metadata: SessionMetadata;
  readSnapshot(tick: number): WorldSnapshot;
  readSidecar(id: string): Uint8Array;
  ticks(): IterableIterator<SessionTickEntry>;
  commands(): IterableIterator<RecordedCommand>;
  executions(): IterableIterator<CommandExecutionResult>;
  failures(): IterableIterator<TickFailure>;
  markers(): IterableIterator<Marker>;
  attachments(): IterableIterator<AttachmentDescriptor>;
  /** Finalize and return the canonical strict-JSON `SessionBundle`. */
  toBundle(): SessionBundle;
}
System.Management.Automation.RemoteException
const DEFAULT_SIDECAR_THRESHOLD_BYTES = 64 * 1024;
System.Management.Automation.RemoteException
export interface MemorySinkOptions {
  /**
   * Allow attachments larger than `sidecarThresholdBytes` to be stored as
   * sidecars (in a parallel internal `Map<string, Uint8Array>` accessed via
   * `readSidecar(id)`). Default `false` ╞Æ?" oversize attachments throw
   * `SinkWriteError(code: 'oversize_attachment')` so that callers who treat
   * the bundle as pure JSON do not encounter surprise external state.
   */
  allowSidecar?: boolean;
  /**
   * Threshold for the dataUrl-vs-sidecar default decision. Attachments at or
   * below this size embed as `dataUrl` in the manifest; above, sidecar (if
   * `allowSidecar: true`) or throw. Default 64 KiB.
   */
  sidecarThresholdBytes?: number;
}
System.Management.Automation.RemoteException
/**
 * In-memory `SessionSink & SessionSource`. Holds writes in arrays and an
 * attachment map; `toBundle()` returns a strict-JSON `SessionBundle`
 * synchronously.
 */
export class MemorySink implements SessionSink, SessionSource {
  private _metadata: SessionMetadata | null = null;
  private readonly _ticks: SessionTickEntry[] = [];
  private readonly _commands: RecordedCommand[] = [];
  private readonly _executions: CommandExecutionResult[] = [];
  private readonly _failures: TickFailure[] = [];
  private readonly _snapshots: SessionSnapshotEntry[] = [];
  private readonly _markers: Marker[] = [];
  private readonly _attachments: AttachmentDescriptor[] = [];
  private readonly _sidecars = new Map<string, Uint8Array>();
  private readonly _allowSidecar: boolean;
  private readonly _threshold: number;
  private _closed = false;
System.Management.Automation.RemoteException
  constructor(options?: MemorySinkOptions) {
    this._allowSidecar = options?.allowSidecar ?? false;
    this._threshold = options?.sidecarThresholdBytes ?? DEFAULT_SIDECAR_THRESHOLD_BYTES;
  }
System.Management.Automation.RemoteException
  get metadata(): SessionMetadata {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened', { code: 'not_opened' });
    }
    return this._metadata;
  }
System.Management.Automation.RemoteException
  open(metadata: SessionMetadata): void {
    if (this._closed) {
      throw new SinkWriteError('sink already closed', { code: 'already_closed' });
    }
    this._metadata = { ...metadata };
  }
System.Management.Automation.RemoteException
  private _assertOpen(): void {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened', { code: 'not_opened' });
    }
    if (this._closed) {
      throw new SinkWriteError('sink already closed', { code: 'already_closed' });
    }
  }
System.Management.Automation.RemoteException
  writeTick(entry: SessionTickEntry): void {
    this._assertOpen();
    assertJsonCompatible(entry, 'session tick entry');
    this._ticks.push(entry);
  }
System.Management.Automation.RemoteException
  writeCommand(record: RecordedCommand): void {
    this._assertOpen();
    assertJsonCompatible(record, 'recorded command');
    this._commands.push(record);
  }
System.Management.Automation.RemoteException
  writeCommandExecution(result: CommandExecutionResult): void {
    this._assertOpen();
    assertJsonCompatible(result, 'command execution result');
    this._executions.push(result);
  }
System.Management.Automation.RemoteException
  writeTickFailure(failure: TickFailure): void {
    this._assertOpen();
    assertJsonCompatible(failure, 'tick failure');
    this._failures.push(failure);
    if (this._metadata) {
      this._metadata.failedTicks = [...(this._metadata.failedTicks ?? []), failure.tick];
    }
  }
System.Management.Automation.RemoteException
  writeSnapshot(entry: SessionSnapshotEntry): void {
    this._assertOpen();
    assertJsonCompatible(entry, 'snapshot entry');
    this._snapshots.push(entry);
    if (this._metadata) {
      this._metadata.persistedEndTick = entry.tick;
    }
  }
System.Management.Automation.RemoteException
  writeMarker(marker: Marker): void {
    this._assertOpen();
    assertJsonCompatible(marker, 'marker');
    this._markers.push(marker);
  }
System.Management.Automation.RemoteException
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor {
    this._assertOpen();
    const oversized = data.byteLength > this._threshold;
    const explicitSidecar = 'sidecar' in descriptor.ref;
    const explicitDataUrl = 'dataUrl' in descriptor.ref;
    // 'auto' is the default ref shape from SessionRecorder.attach() when caller
    // didn't specify a policy. MemorySink's default is dataUrl for under-cap,
    // sidecar for over-cap (with allowSidecar), throw otherwise.
    if (oversized && !explicitSidecar && !this._allowSidecar) {
      throw new SinkWriteError(
        `attachment ${descriptor.id} (${data.byteLength} bytes) exceeds threshold ` +
          `${this._threshold} and sidecar is not enabled (pass MemorySinkOptions.allowSidecar: true)`,
        { code: 'oversize_attachment', sizeBytes: data.byteLength, threshold: this._threshold },
      );
    }
    let final: AttachmentDescriptor;
    // Explicit sidecar always honored. For 'auto', use sidecar when oversized
    // (allowSidecar is true) and dataUrl otherwise. For explicit 'dataUrl',
    // use dataUrl regardless of size ╞Æ?" caller asked for it.
    if (explicitSidecar || (!explicitDataUrl && oversized && this._allowSidecar)) {
      this._sidecars.set(descriptor.id, new Uint8Array(data));
      final = { id: descriptor.id, mime: descriptor.mime, sizeBytes: descriptor.sizeBytes, ref: { sidecar: true } };
    } else {
      const b64 = bytesToBase64(data);
      final = {
        id: descriptor.id, mime: descriptor.mime, sizeBytes: descriptor.sizeBytes,
        ref: { dataUrl: `data:${descriptor.mime};base64,${b64}` },
      };
    }
    this._attachments.push(final);
    return final;
  }
System.Management.Automation.RemoteException
  close(): void {
    if (this._closed) return;
    this._closed = true;
  }
System.Management.Automation.RemoteException
  // --- SessionSource ---
System.Management.Automation.RemoteException
  readSnapshot(tick: number): WorldSnapshot {
    const found = this._snapshots.find((s) => s.tick === tick);
    if (!found) {
      throw new SinkWriteError(`snapshot at tick ${tick} not found`, { code: 'snapshot_missing', tick });
    }
    return found.snapshot;
  }
System.Management.Automation.RemoteException
  readSidecar(id: string): Uint8Array {
    const found = this._sidecars.get(id);
    if (!found) {
      throw new SinkWriteError(`sidecar ${id} not found`, { code: 'sidecar_missing', id });
    }
    return new Uint8Array(found);
  }
System.Management.Automation.RemoteException
  *ticks(): IterableIterator<SessionTickEntry> { for (const t of this._ticks) yield t; }
  *commands(): IterableIterator<RecordedCommand> { for (const c of this._commands) yield c; }
  *executions(): IterableIterator<CommandExecutionResult> { for (const e of this._executions) yield e; }
  *failures(): IterableIterator<TickFailure> { for (const f of this._failures) yield f; }
  *markers(): IterableIterator<Marker> { for (const m of this._markers) yield m; }
  *attachments(): IterableIterator<AttachmentDescriptor> { for (const a of this._attachments) yield a; }
System.Management.Automation.RemoteException
  toBundle(): SessionBundle {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened; cannot build bundle', { code: 'not_opened' });
    }
    if (this._snapshots.length === 0) {
      throw new SinkWriteError(
        'no snapshots written; cannot build bundle (initialSnapshot is required)',
        { code: 'no_snapshots' },
      );
    }
    // The unparameterized `SessionBundle` resolves to defaults
    // <Record<string, never>, Record<string, never>, JsonValue>; the internal
    // arrays carry <Record<string, unknown>> (their default). Both shapes are
    // structurally identical at runtime; the cast reconciles the compile-time
    // variance. Consumers reading via SessionSource get the runtime shape
    // they expect; SessionReplayer (T6) parameterizes its own types.
    return {
      schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
      metadata: { ...this._metadata },
      initialSnapshot: this._snapshots[0].snapshot,
      ticks: this._ticks.slice() as SessionBundle['ticks'],
      commands: this._commands.slice() as unknown as SessionBundle['commands'],
      executions: this._executions.slice() as SessionBundle['executions'],
      failures: this._failures.slice(),
      snapshots: this._snapshots.slice(1),
      markers: this._markers.slice(),
      attachments: this._attachments.slice(),
    };
  }
}
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 945ms:
import type { JsonValue } from './json.js';
System.Management.Automation.RemoteException
/**
 * Base class for every error raised by the session-recording subsystem
 * (`SessionRecorder`, `SessionReplayer`, sinks, sources, scenario adapter).
 * Subclasses are concrete: catch sites that care about cause use
 * `instanceof <Subclass>`; catch sites that just want to know "any
 * session-recording problem" use `instanceof SessionRecordingError`.
 */
export class SessionRecordingError extends Error {
  readonly details: JsonValue | undefined;
  constructor(message: string, details?: JsonValue) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
System.Management.Automation.RemoteException
/**
 * A `Marker` failed `addMarker()` validation per the spec's A6.1 rules
 * (live-tick: entity refs match a live entity at `world.tick`; cells in-bounds;
 * tickRange well-formed). `details` names the offending field.
 * `referencesValidationRule` is an optional dotted reference back to the rule
 * that fired (e.g. `"6.1.entity_liveness"`) for cross-referencing in the
 * session-recording guide.
 */
export class MarkerValidationError extends SessionRecordingError {
  readonly referencesValidationRule: string | undefined;
  constructor(message: string, details?: JsonValue, referencesValidationRule?: string) {
    super(message, details);
    this.referencesValidationRule = referencesValidationRule;
  }
}
System.Management.Automation.RemoteException
/**
 * The recorder is not in a state where the called method is valid:
 * - `connect()` after `disconnect()` (recorder is single-use)
 * - `connect()` on a poisoned world (`details.code === 'world_poisoned'`)
 * - `connect()` when another payload-capturing recorder is attached
 *   (`details.code === 'recorder_already_attached'`)
 * - `addMarker()` / `attach()` / `takeSnapshot()` after `disconnect()`
 */
export class RecorderClosedError extends SessionRecordingError {}
System.Management.Automation.RemoteException
/**
 * A sink write failed (typically I/O on `FileSink`: ENOSPC, EACCES, EBADF,
 * etc.). Wraps the underlying error in `details`. The `SessionRecorder`
 * catches this, sets `metadata.incomplete = true` and `recorder.lastError`,
 * and short-circuits subsequent listener invocations ╞Æ?" the error does NOT
 * propagate out of the engine listener invocation.
 */
export class SinkWriteError extends SessionRecordingError {}
System.Management.Automation.RemoteException
/**
 * Replayer rejects the bundle on version grounds:
 * - `schemaVersion` not understood by this loader (too old / too new)
 * - `engineVersion`'s `b`-component differs from the running engine (cross-`b`
 *   replay refused per spec A11.1 clause 9; within-`b` mismatch warns instead)
 */
export class BundleVersionError extends SessionRecordingError {}
System.Management.Automation.RemoteException
/**
 * A replayer query was called with a tick outside the bundle's valid range.
 * Complete bundles use `[metadata.startTick, metadata.endTick]`; incomplete
 * bundles use `[metadata.startTick, metadata.persistedEndTick]`.
 */
export class BundleRangeError extends SessionRecordingError {}
System.Management.Automation.RemoteException
/**
 * The bundle is structurally invalid or asks for a replay path that isn't
 * supported in v1:
 * - missing snapshots / broken attachment refs / non-monotonic tick entries
 * - `code: 'replay_across_failure'` ╞Æ?" `openAt(tick)` for a tick at-or-after
 *   the first recorded `TickFailure` (out of scope per spec A2)
 * - `code: 'no_replay_payloads'` ╞Æ?" bundle has empty `commands` and
 *   `openAt(tick > startTick)` is requested
 * - `code: 'no_initial_snapshot'` ╞Æ?" scenario adapter received a
 *   `result.history.initialSnapshot === null` (scenario recorder was
 *   configured with `captureInitialSnapshot: false`)
 *
 * Stale entity refs in markers are NOT integrity errors ╞Æ?" markers are
 * point-in-time annotations and may legitimately reference entities that no
 * longer exist by bundle finalization.
 */
export class BundleIntegrityError extends SessionRecordingError {}
System.Management.Automation.RemoteException
/**
 * Replay's `openAt()` encountered a `RecordedCommand` whose `type` has no
 * registered handler in the `worldFactory`-built world. Distinguishes
 * "world factory drift" (factory is missing a handler the recording uses)
 * from generic determinism divergence ╞Æ?" the latter would surface via
 * `selfCheck` divergence reports, not this error.
 */
export class ReplayHandlerMissingError extends SessionRecordingError {}
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 1089ms:
/**
 * Engine version, kept in sync with package.json's "version" field by the
 * release process. Read by SessionRecorder / scenarioResultToBundle for
 * `metadata.engineVersion` in session bundles. Avoids relying on
 * `process.env.npm_package_version` which is only set under `npm run`.
 */
export const ENGINE_VERSION = '0.8.2' as const;
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:20:52.675677Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:20:52.676435Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem docs\\guides | Select-Object -ExpandProperty Name" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem docs\\architecture | Select-Object -ExpandProperty Name" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\README.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\design\\ai-first-dev-roadmap.md" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 547ms:
ai-integration.md
behavior-trees.md
behavioral-metrics.md
building-a-game.md
client-protocol.md
commands-and-events.md
concepts.md
debugging.md
entities-and-components.md
getting-started.md
map-generation.md
pathfinding.md
public-api-and-invariants.md
rendering.md
resources.md
rts-primitives.md
scenario-runner.md
serialization-and-diffs.md
session-recording.md
spatial-grid.md
sub-grid-movement.md
synthetic-playtest.md
systems-and-simulation.md
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 642ms:
ARCHITECTURE.md
decisions.md
drift-log.md
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 729ms:
# Documentation
System.Management.Automation.RemoteException
This is the navigation hub for `civ-engine` documentation.
System.Management.Automation.RemoteException
## Start Here
System.Management.Automation.RemoteException
- [Getting Started](guides/getting-started.md) - Minimal setup, core concepts, and first-world walkthrough
- [Core Concepts](guides/concepts.md) - Headless ECS model, tick lifecycle, determinism, and engine boundaries
- [Building a Complete Game](guides/building-a-game.md) - End-to-end example using the engine as a game foundation
System.Management.Automation.RemoteException
## Reference
System.Management.Automation.RemoteException
- [API Reference](api-reference.md) - Public types, methods, and standalone utilities
- [Architecture](architecture/ARCHITECTURE.md) - Internal structure, subsystem boundaries, and data flow
- [Public API & Invariants](guides/public-api-and-invariants.md) - Package boundary, JSON-safe data rules, entity refs, and write APIs
- [Changelog](changelog.md) - Shipped changes and breaking changes
System.Management.Automation.RemoteException
The API reference is the authoritative public surface. The root `README.md` is intentionally a high-level overview.
System.Management.Automation.RemoteException
## Guides
System.Management.Automation.RemoteException
- [AI Integration](guides/ai-integration.md)
- [Scenario Runner](guides/scenario-runner.md)
- [Entities & Components](guides/entities-and-components.md)
- [Systems & Simulation](guides/systems-and-simulation.md)
- [Spatial Grid](guides/spatial-grid.md)
- [Sub-Grid Movement & Grid Resolution](guides/sub-grid-movement.md)
- [Commands & Events](guides/commands-and-events.md)
- [Resources](guides/resources.md)
- [Serialization & Diffs](guides/serialization-and-diffs.md)
- [Client Protocol](guides/client-protocol.md)
- [Debugging](guides/debugging.md)
- [Session Recording & Replay](guides/session-recording.md)
- [Synthetic Playtest Harness](guides/synthetic-playtest.md) ╞Æ?" Tier-1 autonomous-driver primitive with sub-RNG-isolated policy randomness
- [Behavioral Metrics over Corpus](guides/behavioral-metrics.md) ╞Æ?" Tier-2 corpus reducer with 11 engine-generic built-in metrics + comparison helper
- [Renderer Integration](guides/rendering.md)
- [RTS Primitives](guides/rts-primitives.md)
- [Map Generation](guides/map-generation.md)
- [Pathfinding](guides/pathfinding.md)
- [Behavior Trees](guides/behavior-trees.md)
System.Management.Automation.RemoteException
## Plans and Reviews
System.Management.Automation.RemoteException
Active future work lives in focused plan and review documents rather than a generic roadmap page.
System.Management.Automation.RemoteException
### Active
System.Management.Automation.RemoteException
- No active review TODOs at the moment. Re-open a focused plan only when benchmark data or a concrete game workload justifies it.
System.Management.Automation.RemoteException
### Implemented
System.Management.Automation.RemoteException
- [AI Runtime Feedback Plan](reviews/done/AI_RUNTIME_FEEDBACK_PLAN.md) - Tick-time command execution, structured tick failures, and transport/debug/history runtime feedback that has already landed
- [AI Final Form Plan](reviews/done/AI_FINAL_FORM_PLAN.md) - Versioned AI contracts, budget-aware diagnostics, and history range summaries that have already landed
- [AI-First Engine Plan](reviews/done/AI_FIRST_ENGINE_PLAN.md) - Machine-facing command/debug/history improvements that have already landed
- [Render Contract and Debugger Plan](reviews/done/RENDER_CONTRACT_AND_DEBUGGER_PLAN.md) - Render-facing projection and debugger support work that has already landed
- [RTS Engine Scale Plan](reviews/done/RTS_ENGINE_SCALE_PLAN.md) - RTS-scale support work that has already landed
- [Expert Review Remaining Candidates](reviews/done/EXPERT_REVIEW_REMAINING.md) - Archived on 2026-04-11; remaining SoA and dependency-graph ideas stay deferred until measured workloads justify them
- [Expert Review](reviews/done/EXPERT_REVIEW.md) - Review findings already addressed
- [Engine Design Review](reviews/done/ENGINE_DESIGN_REVIEW.md) - Broader engine assessment
- [Engine Hardening Plan](reviews/done/ENGINE_HARDENING_PLAN.md) - Hardening work that has already landed
System.Management.Automation.RemoteException
## History and Internal Process
System.Management.Automation.RemoteException
- [Devlog Summary](devlog/summary.md) - Short chronological history
- [Devlog Detailed](devlog/detailed/) - Detailed implementation logs
- [`superpowers/plans/`](superpowers/plans) - Historical implementation plans
- [`superpowers/specs/`](superpowers/specs) - Historical design specs
System.Management.Automation.RemoteException
The `superpowers/` and devlog documents are retained as project history. They may mention files or workflows that have since been reorganized.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 728ms:
# AI-First Game Development Roadmap
System.Management.Automation.RemoteException
**Status:** Living document. Updated whenever a spec lands or scope shifts.
System.Management.Automation.RemoteException
**Vision:** civ-engine should support an environment where AI agents do as much game-development work as possible without human intervention ╨ô?" generating, exercising, debugging, and verifying game logic autonomously, with humans involved only for design intent and judgment calls. This document captures the multi-spec roadmap that delivers that environment.
System.Management.Automation.RemoteException
A single recording-and-replay spec is the substrate. The full vision spans nine specs across three tiers; specs are tracked individually under `docs/design/<date>-<topic>-design.md`.
System.Management.Automation.RemoteException
## Tier 1 ╨ô?" Foundational
System.Management.Automation.RemoteException
Without these, "AI-first" is aspirational. They are the irreducible substrate for autonomous feedback loops.
System.Management.Automation.RemoteException
### Spec 1: Session Recording & Replay (engine primitives)
System.Management.Automation.RemoteException
Status: **Drafted 2026-04-26.** See `2026-04-26-session-recording-and-replay-design.md`.
System.Management.Automation.RemoteException
What it delivers: deterministic capture of any World run as a portable `SessionBundle`; replay engine that opens a paused World at any tick; marker API for human and programmatic annotations; sink interface for memory and disk persistence; unification with `ScenarioRunner` so test runs and live captures share the same bundle format and replayer.
System.Management.Automation.RemoteException
What it unlocks: every other spec in this roadmap.
System.Management.Automation.RemoteException
### Spec 3: Synthetic Playtest Harness
System.Management.Automation.RemoteException
Status: **Proposed.**
System.Management.Automation.RemoteException
What it delivers: a harness that constructs a `World`, attaches a `SessionRecorder`, drives `world.submit()` from a pluggable policy (random / scripted / LLM-driven / heuristic agents), runs for N ticks, and saves the bundle. Trivially parallelizable across cores or machines. Produces a corpus of bundles per commit.
System.Management.Automation.RemoteException
What it unlocks: the actual feedback loop. Without synthetic playtest, recording just makes human bug reports nicer; with it, every commit gets autonomous exploration. Agents review the corpus and self-file regressions before any human plays the game.
System.Management.Automation.RemoteException
Why it depends on Spec 1: synthetic playtest is just "policy ╨ô+' submit() ╨ô+' SessionBundle"; without recording there is no artifact to analyze.
System.Management.Automation.RemoteException
### Spec 8: Behavioral Metrics over Corpus
System.Management.Automation.RemoteException
Status: **Proposed.**
System.Management.Automation.RemoteException
What it delivers: a metrics layer that ingests bundles from the synthetic playtest corpus, computes design-relevant statistics (median session length, decision points per minute, resource Gini, time-to-first-conflict, dominant strategy distribution, etc.), and tracks these across commits. Regression detection: "the median session length dropped 30% after this commit" gets surfaced automatically.
System.Management.Automation.RemoteException
What it unlocks: a meaningful definition of "regression" for emergent behavior, which unit tests can't capture. Designers and agents share a common quantitative vocabulary for "is the game still doing what we want."
System.Management.Automation.RemoteException
### Scenario library (continuous, no spec)
System.Management.Automation.RemoteException
The convention that every annotated bug bundle gets promoted to a permanent regression scenario. Implemented incrementally as part of Specs 1, 3, and 4. The library compounds: it becomes the project's institutional memory of "what's known to be hard."
System.Management.Automation.RemoteException
## Tier 2 ╨ô?" Multipliers
System.Management.Automation.RemoteException
Tier 1 makes AI-first possible. Tier 2 makes it powerful.
System.Management.Automation.RemoteException
### Spec 9: AI Playtester Agent
System.Management.Automation.RemoteException
Status: **Proposed.**
System.Management.Automation.RemoteException
What it delivers: a separate LLM-driven agent that plays the game (via the same `submit()` boundary), then writes natural-language qualitative feedback ("I found myself doing X repetitively in the early game; the second hour felt aimless"). Distinct from coding agents ╨ô?" its job is to *play and report*, not to edit code.
System.Management.Automation.RemoteException
What it unlocks: the closest approximation to "is it fun?" that doesn't require a human. Combined with Spec 8's quantitative metrics, the design loop closes.
System.Management.Automation.RemoteException
Why it depends on Spec 3: the playtester is just a specific class of policy plugged into the synthetic harness, plus an LLM-driven post-run report.
System.Management.Automation.RemoteException
### Spec 7: Bundle Search / Corpus Index
System.Management.Automation.RemoteException
Status: **Proposed.**
System.Management.Automation.RemoteException
What it delivers: an index over the bundle corpus with structured query: "show me all sessions where pathfinding flagged stuck units in the first 1000 ticks," "find sessions with high decision-point variance," "find sessions where the player's resource balance crashed below threshold X." Bundle metadata is indexed; bundle content is queryable on demand via the replayer.
System.Management.Automation.RemoteException
What it unlocks: the corpus stops being a folder of files and becomes a query surface for both agents and humans.
System.Management.Automation.RemoteException
Why it depends on Specs 3 and 4: the corpus needs to exist (3) and be navigable (4) before indexing it earns its keep.
System.Management.Automation.RemoteException
### Anomaly detection over the corpus (continuous, no spec)
System.Management.Automation.RemoteException
A continuous capability that surfaces statistical outliers in tick timing, state divergences, surprise event sequences, etc. Implemented incrementally on top of Specs 7 and 8. The agent surfaces these and investigates without prompting.
System.Management.Automation.RemoteException
## Tier 3 ╨ô?" Productivity Tooling
System.Management.Automation.RemoteException
Tier 3 is leverage on top of an already-working autonomous loop. Defer until Tier 1 and 2 are mature.
System.Management.Automation.RemoteException
### Spec 4: Standalone Bundle Viewer
System.Management.Automation.RemoteException
Status: **Proposed.**
System.Management.Automation.RemoteException
What it delivers: a separate package (in this repo, sibling to engine sources) that loads bundles, scrubs a timeline, jumps to markers, diffs state between any two ticks, and replays into a paused World. Includes a programmatic agent-driver API: `bundle.atMarker(id).state(...).events(...).diffSince(...)`. UI optional in v1; CLI / library is sufficient.
System.Management.Automation.RemoteException
What it unlocks: human productivity. Agents can drive the bundle programmatically without it; humans benefit from the GUI scrubber.
System.Management.Automation.RemoteException
Why it depends on Spec 1: the viewer reads bundles.
System.Management.Automation.RemoteException
### Spec 2: Game-Side Annotation UI
System.Management.Automation.RemoteException
Status: **Proposed.**
System.Management.Automation.RemoteException
What it delivers: in-game hotkey + annotation form + drawing tools (entity selection, region lasso, suggested-path arrow, freehand scribble, screenshot capture). Resolves visual gestures to engine references (entity IDs, world coordinates) at annotation time, attaching the resolved refs to the marker. Free-text and screenshot blob travel as supplementary attachments. Game-specific code per game; this spec defines the conventions.
System.Management.Automation.RemoteException
What it unlocks: rich, structured human bug reports. Player annotations populate the scenario library (Tier 1).
System.Management.Automation.RemoteException
Why it depends on Spec 1: the marker schema is engine-side; the UI just produces markers.
System.Management.Automation.RemoteException
### Spec 5: Counterfactual Replay / Fork
System.Management.Automation.RemoteException
Status: **Proposed.**
System.Management.Automation.RemoteException
What it delivers: `SessionReplayer.forkAt(tick).substitute(commands).run()` ╨ô?" change inputs at tick N, replay forward, observe how the simulation diverges from the original. Two-bundle diff utility for visualizing divergence. Substitution semantics, divergence detection, replay-fork tree.
System.Management.Automation.RemoteException
What it unlocks: the most powerful debugging primitive. "If the player had done X instead of Y, what would have happened?" becomes a single API call.
System.Management.Automation.RemoteException
Why it's deferred: high architectural complexity (input substitution, divergence representation, fork trees), and the agent's main debugging workflow (load, jump to marker, inspect, step) is fully served by Spec 1's `openAt`. Build it when synthetic playtest reveals concrete counterfactual queries the agent wants to issue.
System.Management.Automation.RemoteException
### Spec 6: Engine Strict-Mode Determinism Enforcement
System.Management.Automation.RemoteException
Status: **Proposed.** Independent of the other specs in this roadmap.
System.Management.Automation.RemoteException
What it delivers: `World({ strict: true })` flag that rejects mutations from outside system phases. All external state changes must go through `submit()`. Includes escape hatches for setup, deserialization, and explicit out-of-tick maintenance. Auditing of all mutation methods to gate on inside-tick state.
System.Management.Automation.RemoteException
What it unlocks: structural enforcement of the determinism contract that Spec 1 only documents. Replays can no longer silently diverge ╨ô?" violations throw at the source.
System.Management.Automation.RemoteException
Why it's deferred: it's a meaty engine-wide behavioral change with its own design problem (escape hatches, migration, false-positive risk for legitimate setup code). Best handled as a focused spec when its costs and benefits can be evaluated standalone. Spec 1's `selfCheck()` provides 80% of the safety with 0% of the engine surgery in the meantime.
System.Management.Automation.RemoteException
## Spec Dependency Graph
System.Management.Automation.RemoteException
```
                       ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?
                       ╨ô",  Spec 1: Session Recording & Replay  ╨ô",
                       ╨ô",           (foundation)               ╨ô",
                       ╨ô""╨ô"?╨ô"╨║╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"╨║╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"╨║╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"~
                         ╨ô",            ╨ô",               ╨ô",
                ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"'╨ô"?╨ô"?╨ô"?╨ô"?  ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"'╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?   ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"'╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?
                ╨ô", Spec 2:    ╨ô",  ╨ô", Spec 3:   ╨ô",   ╨ô", Spec 4:       ╨ô",
                ╨ô", Annotation ╨ô",  ╨ô", Synthetic ╨ô",   ╨ô", Standalone    ╨ô",
                ╨ô", UI (game)  ╨ô",  ╨ô", Playtest  ╨ô",   ╨ô", Viewer        ╨ô",
                ╨ô""╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"~  ╨ô""╨ô"?╨ô"╨║╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"╨║╨ô"?╨ô"~   ╨ô""╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"╨║╨ô"?╨ô"?╨ô"~
                                  ╨ô",       ╨ô",                  ╨ô",
                          ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"'╨ô"?╨ô"?╨ô"?  ╨ô"O╨ô"?╨ô"'╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?  ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"'╨ô"?╨ô"?╨ô"?╨ô"?
                          ╨ô", Spec 8:  ╨ô",  ╨ô", Spec 9:  ╨ô",  ╨ô", Spec 7:  ╨ô",
                          ╨ô", Behav.   ╨ô",  ╨ô", AI Play- ╨ô",  ╨ô", Corpus   ╨ô",
                          ╨ô", Metrics  ╨ô",  ╨ô", tester   ╨ô",  ╨ô", Index    ╨ô",
                          ╨ô""╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"~  ╨ô""╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"~  ╨ô""╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"~
System.Management.Automation.RemoteException
       (independent, parallelizable)
       ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?
       ╨ô",  Spec 5: Counterfactual / Fork       ╨ô",  ╨ô+' depends on Spec 1
       ╨ô""╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"~
       ╨ô"O╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?
       ╨ô",  Spec 6: Strict-Mode Enforcement     ╨ô",  ╨ô+' independent of all
       ╨ô""╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"?╨ô"~
```
System.Management.Automation.RemoteException
## Suggested Build Order
System.Management.Automation.RemoteException
1. Spec 1 (recording & replay) ╨ô?" substrate for everything.
2. Spec 3 (synthetic playtest) ╨ô?" turns recording from "improve human bug reports" into "infinite autonomous bug discovery." Highest leverage.
3. Spec 8 (behavioral metrics) ╨ô?" pairs with Spec 3 to define regressions for emergent behavior.
4. Spec 2 (game-side annotation UI) ╨ô?" humans plug into the same system; game-specific work that can ship in parallel with Spec 4.
5. Spec 4 (standalone viewer) ╨ô?" productivity multiplier for both agents and humans.
6. Spec 7 (corpus index) ╨ô?" once corpus is large enough that browsing it linearly hurts.
7. Spec 9 (AI playtester) ╨ô?" once Specs 3 and 8 are mature enough to drive qualitative feedback usefully.
8. Spec 5 (counterfactual) ╨ô?" once concrete counterfactual queries emerge from agent workflows.
9. Spec 6 (strict-mode) ╨ô?" independent, can ship at any point. Schedule based on determinism-bug pain.
System.Management.Automation.RemoteException
## Status Tracker
System.Management.Automation.RemoteException
| Spec | Title                                | Status     | File                                                      |
| ---- | ------------------------------------ | ---------- | --------------------------------------------------------- |
| 1    | Session Recording & Replay           | **Implemented** (v0.7.7-pre ╨ô+' v0.7.19) | `2026-04-26-session-recording-and-replay-design.md` (v5)  |
| 2    | Game-Side Annotation UI              | Proposed   | not yet drafted                                           |
| 3    | Synthetic Playtest Harness           | **Implemented** (v0.7.20 + v0.8.0 + v0.8.1) | `2026-04-27-synthetic-playtest-harness-design.md` (v10) + `2026-04-27-synthetic-playtest-implementation-plan.md` (v7) |
| 4    | Standalone Bundle Viewer             | Proposed   | not yet drafted                                           |
| 5    | Counterfactual Replay / Fork         | Proposed   | not yet drafted                                           |
| 6    | Strict-Mode Determinism Enforcement  | Proposed   | not yet drafted                                           |
| 7    | Bundle Search / Corpus Index         | Proposed   | not yet drafted                                           |
| 8    | Behavioral Metrics over Corpus       | **Implemented** (v0.8.2) | `2026-04-27-behavioral-metrics-design.md` (v4) + `2026-04-27-behavioral-metrics-implementation-plan.md` (v4) |
| 9    | AI Playtester Agent                  | Proposed   | not yet drafted                                           |
System.Management.Automation.RemoteException
Update this row as specs are drafted, accepted, implemented, and merged.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:21:00.327731Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:21:00.328238Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:21:06.195388Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem docs\\design | Where-Object { "'$_.Name -like '"'*bundle-corpus-index*' } | Select-Object -ExpandProperty Name"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem docs\\design | Where-Object { "'$_.Name -like '"'*bundle-corpus-index*' } | Select-Object -ExpandProperty Name" in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem docs\\design | Where-Object { "'$_.Name -like '"'*bundle-corpus-index*' } | Select-Object -ExpandProperty Name"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\api-reference.md" in C:\Users\38909\Documents\github\civ-engine
2026-04-28T01:21:06.218457Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '(Get-ChildItem tests -File | Select-Object -ExpandProperty Name) -join "`n"'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '(Get-ChildItem tests -File | Select-Object -ExpandProperty Name) -join "`n"' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '(Get-ChildItem tests -File | Select-Object -ExpandProperty Name) -join "`n"'` rejected: blocked by policy
 succeeded in 636ms:
# API Reference
System.Management.Automation.RemoteException
Complete reference for every public type, method, and module in civ-engine.
System.Management.Automation.RemoteException
## Table of Contents
System.Management.Automation.RemoteException
- [Types](#types)
- [World](#world)
  - [Constructor](#constructor)
  - [Entity Management](#entity-management)
  - [Components](#components)
  - [Systems & Simulation](#systems--simulation)
  - [Speed Control](#speed-control)
  - [Commands](#commands)
  - [Events](#events)
  - [Resources](#resources)
  - [World State](#world-state)
  - [Tags & Metadata](#tags--metadata)
  - [Spatial Queries](#spatial-queries)
  - [State Serialization](#state-serialization)
  - [State Diffs](#state-diffs)
  - [Entity Lifecycle Hooks](#entity-lifecycle-hooks)
- [SpatialGrid](#spatialgrid)
- [Pathfinding](#pathfinding)
- [OccupancyGrid](#occupancygrid)
- [OccupancyBinding](#occupancybinding)
- [SubcellOccupancyGrid](#subcelloccupancygrid)
- [Path Service](#path-service)
- [VisibilityMap](#visibilitymap)
- [Command Transaction](#command-transaction)
- [Layer](#layer)
- [Noise](#noise)
- [Cellular Automata](#cellular-automata)
- [Map Generation](#map-generation)
- [Behavior Tree](#behavior-tree)
- [Client Adapter](#client-adapter)
- [Render Adapter](#render-adapter)
- [Scenario Runner](#scenario-runner)
- [World History Recorder](#world-history-recorder)
- [World Debugger](#world-debugger)
- [Session Recording ╞Æ?" Bundle Types & Errors](#session-recording--bundle-types--errors)
- [Session Recording ╞Æ?" Sinks (SessionSink, SessionSource, MemorySink)](#session-recording--sinks-sessionsink-sessionsource-memorysink)
- [Session Recording ╞Æ?" FileSink](#session-recording--filesink)
- [Session Recording ╞Æ?" SessionRecorder](#session-recording--sessionrecorder)
- [Session Recording ╞Æ?" SessionReplayer](#session-recording--sessionreplayer)
- [Session Recording ╞Æ?" scenarioResultToBundle](#session-recording--scenarioresulttobundle)
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Types
System.Management.Automation.RemoteException
Package consumers should import public types and utilities from the root module, `civ-engine`. Source file comments below identify where each type is owned.
System.Management.Automation.RemoteException
### `EntityId`
System.Management.Automation.RemoteException
```typescript
// src/types.ts
type EntityId = number;
```
System.Management.Automation.RemoteException
Numeric identifier for entities. IDs are recycled via a free-list after destruction. Two entities may share the same ID across different lifetimes but never simultaneously.
System.Management.Automation.RemoteException
### `EntityRef`
System.Management.Automation.RemoteException
```typescript
// src/types.ts
interface EntityRef {
  id: EntityId;
  generation: number;
}
```
System.Management.Automation.RemoteException
Generation-aware entity reference. Use this for external commands and clients that need to detect stale entity IDs after destruction and recycling.
System.Management.Automation.RemoteException
### `Position`
System.Management.Automation.RemoteException
```typescript
// src/types.ts
interface Position {
  x: number;
  y: number;
}
```
System.Management.Automation.RemoteException
Standard 2D position interface used for spatial grid synchronization. The component key for spatial tracking is configurable via `WorldConfig.positionKey` (default `'position'`).
System.Management.Automation.RemoteException
### `InstrumentationProfile`
System.Management.Automation.RemoteException
```typescript
// src/types.ts
type InstrumentationProfile = 'full' | 'minimal' | 'release';
```
System.Management.Automation.RemoteException
Controls how much implicit runtime instrumentation the engine keeps on the hot path.
System.Management.Automation.RemoteException
- `full` keeps the normal development behavior. `step()` records detailed per-tick metrics and `submit()` preserves the compatibility wrapper over `submitWithResult()`.
- `minimal` is the QA/staging profile. `step()` records coarse per-tick metrics such as counts and total duration, but skips detailed phase timings and per-system timing entries.
- `release` removes avoidable observation work from the implicit `step()` and `submit()` paths. Explicit AI/debug APIs such as `stepWithResult()` and `submitWithResult()` still return structured results when you call them.
System.Management.Automation.RemoteException
### `WorldConfig`
System.Management.Automation.RemoteException
```typescript
// src/types.ts
interface WorldConfig {
  gridWidth: number;       // Width of the spatial grid (required)
  gridHeight: number;      // Height of the spatial grid (required)
  tps: number;             // Ticks per second for real-time loop (required)
  positionKey?: string;    // Component key used for spatial sync (default: 'position')
  maxTicksPerFrame?: number; // Spiral-of-death cap (default: 4)
  seed?: number | string;  // Deterministic RNG seed
  instrumentationProfile?: InstrumentationProfile; // Implicit instrumentation level (default: 'full')
}
```
System.Management.Automation.RemoteException
### `System`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
type System<TEventMap, TCommandMap, TComponents, TState> = (
  world: World<TEventMap, TCommandMap, TComponents, TState>,
) => void;
```
System.Management.Automation.RemoteException
A system is a pure function that receives the `World` and runs game logic. Systems execute by phase, preserving registration order within each phase. Bare function registrations default to the `update` phase. All four generics default to permissive types so existing 2-generic call sites continue to compile; threading `TComponents` and `TState` through gives compile-time-typed `world.getComponent` / `world.getState` access inside the callback body.
System.Management.Automation.RemoteException
### `SystemRegistration`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface SystemRegistration<TEventMap, TCommandMap, TComponents, TState> {
  name?: string;
  phase?: 'input' | 'preUpdate' | 'update' | 'postUpdate' | 'output';
  before?: string[];
  after?: string[];
  interval?: number;
  intervalOffset?: number;
  execute: System<TEventMap, TCommandMap, TComponents, TState>;
}
```
System.Management.Automation.RemoteException
Optional system registration object for naming systems and assigning a lifecycle phase. The `before` and `after` fields declare ordering constraints between named systems within the same phase (see [System Ordering Constraints](#registersystemfnorconfig)).
System.Management.Automation.RemoteException
`interval` (default `1`) gates how often the system runs. The system fires only when `(executingTick - 1) % interval === intervalOffset`, where `executingTick` is the tick number being processed (equal to `world.tick + 1` while the system is running, or equivalently the value of `world.tick` after `step()` returns successfully). With `interval: 4` and `intervalOffset: 0`, the system runs at ticks 1, 5, 9, 13 ╞Æ?" i.e., it fires on the first tick and then every 4 ticks, which matches the legacy `if (world.tick % 4 !== 0) return;` pattern.
System.Management.Automation.RemoteException
`intervalOffset` (default `0`, must satisfy `0 <= intervalOffset < interval`) shifts the cadence within the cycle. `interval: 4, intervalOffset: 1` fires at ticks 2, 6, 10. Three systems with `interval: 3` and offsets `0`/`1`/`2` partition every tick into a stable round-robin.
System.Management.Automation.RemoteException
Use intervals to throttle expensive subsystems (slow propagation, periodic AI re-planning, weather updates) without changing each system's logic. Skipped systems do not invoke their `execute` body and do not push a per-system entry into `metrics.systems`; the per-tick total in `metrics.durationMs.systems` still includes the cheap modulo check across all registered systems, so the savings come from the body, not from the dispatch. **Failed ticks consume a cadence slot:** if the executing tick fails, any periodic system whose modulo aligned with that tick simply does not fire ╞Æ?" the engine does not retry on the next successful tick.
System.Management.Automation.RemoteException
Validation throws at registration if `interval` is not a safe integer (`Number.isSafeInteger`) >= 1, or if `intervalOffset` is not a safe integer in `[0, interval)`. Bounding `interval` to safe-integer range avoids non-deterministic modulo results past `2^53`.
System.Management.Automation.RemoteException
### `LooseSystem`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
type LooseSystem = (world: World<any, any, any, any>) => void;
```
System.Management.Automation.RemoteException
A system typed against a bare `World` that does not need explicit casts when registered into a generically typed world. Useful for utility systems that do not depend on specific event/command/component/state maps.
System.Management.Automation.RemoteException
### `LooseSystemRegistration`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface LooseSystemRegistration {
  name?: string;
  phase?: 'input' | 'preUpdate' | 'update' | 'postUpdate' | 'output';
  before?: string[];
  after?: string[];
  interval?: number;
  intervalOffset?: number;
  execute: LooseSystem;
}
```
System.Management.Automation.RemoteException
Same shape as `SystemRegistration` but uses `LooseSystem` instead. `interval` and `intervalOffset` carry the same semantics as on `SystemRegistration`.
System.Management.Automation.RemoteException
### `ComponentRegistry`
System.Management.Automation.RemoteException
```typescript
// src/types.ts
type ComponentRegistry = Record<string, unknown>;
```
System.Management.Automation.RemoteException
Third type parameter to `World<TEventMap, TCommandMap, TComponents, TState>`. When specified, component methods (`addComponent`, `getComponent`, `setComponent`, `patchComponent`, `removeComponent`, `query`) infer value types from the registry keys, eliminating manual generic annotations. The fourth `TState` generic plays the analogous role for `world.setState` / `world.getState`. Both generics thread through `System`, `SystemRegistration`, `registerSystem`, `registerValidator`, `registerHandler`, `onDestroy`, and `World.deserialize` so typed access works inside callback bodies.
System.Management.Automation.RemoteException
### `WorldMetrics`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface WorldMetrics {
  tick: number;
  entityCount: number;
  componentStoreCount: number;
  simulation: { tps: number; tickBudgetMs: number };
  commandStats: { pendingBeforeTick: number; processed: number };
  systems: Array<{ name: string; phase: SystemPhase; durationMs: number }>;
  query: { calls: number; cacheHits: number; cacheMisses: number; results: number };
  spatial: { explicitSyncs: number };
  durationMs: {
    total: number;
    commands: number;
    systems: number;
    resources: number;
    diff: number;
  };
}
```
System.Management.Automation.RemoteException
Last-tick instrumentation returned by `world.getMetrics()`. In `instrumentationProfile: 'minimal'`, implicit `step()` refreshes only the coarse metrics fields. In `instrumentationProfile: 'release'`, implicit `step()` leaves this as `null`; explicit `stepWithResult()` still refreshes the full metrics payload.
System.Management.Automation.RemoteException
### `getAiContractVersions()`
System.Management.Automation.RemoteException
```typescript
// src/ai-contract.ts
function getAiContractVersions(): {
  commandResult: number;
  worldDebug: number;
  worldHistory: number;
  worldHistoryRangeSummary: number;
  scenarioResult: number;
  clientProtocol: number;
}
```
System.Management.Automation.RemoteException
Returns the current version markers for the engine's machine-facing AI contracts.
System.Management.Automation.RemoteException
### `CommandValidationRejection`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface CommandValidationRejection {
  code: string;
  message?: string;
  details?: JsonValue;
}
```
System.Management.Automation.RemoteException
Structured validator rejection used by `registerValidator()` and `submitWithResult()`.
System.Management.Automation.RemoteException
### `CommandValidationResult`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
type CommandValidationResult = boolean | CommandValidationRejection;
```
System.Management.Automation.RemoteException
Validators may still return `true` or `false`. Returning a rejection object preserves stable machine-readable details.
System.Management.Automation.RemoteException
### `CommandSubmissionResult<TCommandType>`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface CommandSubmissionResult<TCommandType extends PropertyKey = string> {
  schemaVersion: number;
  accepted: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
  sequence: number;
  validatorIndex: number | null;
}
```
System.Management.Automation.RemoteException
Structured outcome returned by `world.submitWithResult()` and emitted through `world.onCommandResult()`.
System.Management.Automation.RemoteException
### `CommandExecutionResult<TCommandType>`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface CommandExecutionResult<TCommandType extends PropertyKey = string> {
  schemaVersion: number;
  submissionSequence: number | null;
  executed: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
}
```
System.Management.Automation.RemoteException
Structured outcome emitted through `world.onCommandExecution()` after a queued command is processed on a tick.
System.Management.Automation.RemoteException
### `TickFailurePhase`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
type TickFailurePhase =
  | 'commands'
  | 'systems'
  | 'resources'
  | 'diff'
  | 'listeners';
```
System.Management.Automation.RemoteException
Named phases used by structured tick failures.
System.Management.Automation.RemoteException
### `TickFailure`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface TickFailure {
  schemaVersion: number;
  tick: number;
  phase: TickFailurePhase;
  code: string;
  message: string;
  subsystem: string;
  commandType: string | null;
  submissionSequence: number | null;
  systemName: string | null;
  details: JsonValue | null;
  error: {
    name: string;
    message: string;
    stack: string | null;
  } | null;
}
```
System.Management.Automation.RemoteException
Structured runtime failure for one tick. Returned by `world.stepWithResult()`, emitted through `world.onTickFailure()`, exposed through `world.getLastTickFailure()`, and forwarded by `ClientAdapter`.
System.Management.Automation.RemoteException
### `WorldStepResult`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
interface WorldStepResult {
  schemaVersion: number;
  ok: boolean;
  tick: number;
  failure: TickFailure | null;
}
```
System.Management.Automation.RemoteException
Structured result returned by `world.stepWithResult()`.
System.Management.Automation.RemoteException
### `WorldTickFailureError`
System.Management.Automation.RemoteException
```typescript
// src/world.ts
class WorldTickFailureError extends Error {
  readonly failure: TickFailure;
}
```
System.Management.Automation.RemoteException
Thrown by `world.step()` when a tick fails. Also thrown by `world.step()` (and surfaced as a `world_poisoned` failure result by `world.stepWithResult()`) for any subsequent step until `world.recover()` is called ╞Æ?" see Tick failure semantics.
System.Management.Automation.RemoteException
### Tick failure semantics
System.Management.Automation.RemoteException
A failure in any tick phase (commands, systems, resources, diff, listeners) marks the world as **poisoned**:
System.Management.Automation.RemoteException
- `world.isPoisoned(): boolean` returns `true` until the next call to `recover()`.
- While poisoned, `world.step()` throws `WorldTickFailureError` and `world.stepWithResult()` returns a `WorldStepResult` with `failure.code === 'world_poisoned'`. The original failure that caused the poison is preserved on the result for diagnostics.
- `world.recover(): void` clears the poison flag and the cached `lastTickFailure`/`currentDiff`/`currentMetrics`. After `recover()`, the next `step()` runs normally.
System.Management.Automation.RemoteException
Failed ticks consume a tick number. If a tick fails at would-be tick `N+1`, `world.tick` advances to `N+1`; the next successful tick after `recover()` is `N+2`. This guarantees that failed-tick events and successful-tick events never share a `tick` value, so consumers can correlate by tick number unambiguously.
System.Management.Automation.RemoteException
When a command handler throws (or its handler is missing), every command queued for that tick that has not yet executed is emitted as a `commandExecuted: false` event with `code: 'tick_aborted_before_handler'`, and the dropped commands' `submissionSequence`s are recorded on `failure.details.droppedCommands`. The queue is not re-populated ╞Æ?" these commands are dropped, not retried.
System.Management.Automation.RemoteException
### `WorldSnapshot`
System.Management.Automation.RemoteException
```typescript
// src/serializer.ts
interface WorldSnapshot {
  version: 5;
  config: WorldConfig; // includes maxTicksPerFrame and instrumentationProfile when non-default
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  componentOptions?: Record<string, ComponentStoreOptions>; // diffMode per component
  resources: ResourceStoreState;
  rng: RandomState;
  state: Record<string, unknown>;
  tags: Record<number, string[]>;
  metadata: Record<number, Record<string, string | number>>;
}
```
System.Management.Automation.RemoteException
JSON-serializable snapshot of the entire world state, deep-cloned at both serialize and deserialize boundaries so callers cannot mutate live engine state through it. Used by `serialize()` and `World.deserialize()`. Version 5 adds `componentOptions` (per-component `diffMode` round-trip) and serializes `WorldConfig.maxTicksPerFrame` / `WorldConfig.instrumentationProfile` when non-default. Version 4 added world-level state, entity tags, and entity metadata. Version 3 includes deterministic RNG state so a saved simulation resumes the same random sequence. Version 2 includes resource registrations, pools, rates, transfers, and the next transfer ID. Versions 1╞Æ?"4 are still accepted by `World.deserialize()` for backward compatibility ╞Æ?" older snapshots without `componentOptions` deserialize each component store with default options. Systems, validators, handlers, and event listeners are not included (they are functions, not data). Pre-0.5.0 snapshots may include `config.detectInPlacePositionMutations` and `componentOptions[*].detectInPlaceMutations`; both are silently ignored on read in 0.5.0+.
System.Management.Automation.RemoteException
### `TickDiff`
System.Management.Automation.RemoteException
```typescript
// src/diff.ts
interface TickDiff {
  tick: number;
  entities: {
    created: EntityId[];
    destroyed: EntityId[];
  };
  components: Record<string, {
    set: Array<[EntityId, unknown]>;
    removed: EntityId[];
  }>;
  resources: Record<string, {
    set: Array<[EntityId, ResourcePool]>;
    removed: EntityId[];
  }>;
  state: Record<string, { set?: unknown; removed?: true }>;
  tags: Record<string, {
    added: EntityId[];
    removed: EntityId[];
  }>;
  metadata: Record<string, {
    set: Array<[EntityId, string | number]>;
    removed: EntityId[];
  }>;
}
```
System.Management.Automation.RemoteException
Per-tick change set capturing every entity, component, resource, world state, tag, and metadata entry that changed. Only types/keys that actually changed appear in the record.
System.Management.Automation.RemoteException
### `ResourcePool`
System.Management.Automation.RemoteException
```typescript
// src/resource-store.ts
interface ResourcePool {
  current: number;
  max: number | null;
}
```
System.Management.Automation.RemoteException
A resource pool with a current value and a maximum capacity. `max: null` means unbounded capacity and is used instead of `Infinity` so snapshots and diffs stay JSON-safe.
System.Management.Automation.RemoteException
### `ResourceStoreState`
System.Management.Automation.RemoteException
```typescript
// src/resource-store.ts
interface ResourceStoreState {
  registered: Array<[string, { defaultMax: number | null }]>;
  pools: Record<string, Array<[EntityId, ResourcePool]>>;
  production: Record<string, Array<[EntityId, number]>>;
  consumption: Record<string, Array<[EntityId, number]>>;
  transfers: Transfer[];
  nextTransferId: number;
}
```
System.Management.Automation.RemoteException
Serializable resource subsystem state included in snapshot versions 2 and 3.
System.Management.Automation.RemoteException
### `RandomState`
System.Management.Automation.RemoteException
```typescript
// src/random.ts
interface RandomState {
  state: number;
}
```
System.Management.Automation.RemoteException
Serializable deterministic RNG state included in snapshot version 3.
System.Management.Automation.RemoteException
### `Transfer`
System.Management.Automation.RemoteException
```typescript
// src/resource-store.ts
interface Transfer {
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}
```
System.Management.Automation.RemoteException
A recurring resource transfer between two entities, processed each tick.
System.Management.Automation.RemoteException
### `PathConfig<T>`
System.Management.Automation.RemoteException
```typescript
// src/pathfinding.ts
interface PathConfig<T> {
  start: T;                                   // Starting node
  goal: T;                                    // Target node
  neighbors: (node: T) => T[];               // Returns adjacent nodes
  cost: (from: T, to: T) => number;          // Edge cost (Infinity = impassable)
  heuristic: (node: T, goal: T) => number;   // Estimated cost to goal
  hash: (node: T) => string | number;        // Unique node identifier
  maxCost?: number;                           // Cost ceiling (default: Infinity)
  maxIterations?: number;                     // Iteration limit (default: 10,000)
  trackExplored?: boolean;                    // Include explored count (default: false)
}
```
System.Management.Automation.RemoteException
### `PathResult<T>`
System.Management.Automation.RemoteException
```typescript
// src/pathfinding.ts
interface PathResult<T> {
  path: T[];         // Ordered list of nodes from start to goal (inclusive)
  cost: number;      // Total path cost
  explored?: number; // Number of nodes explored (only if trackExplored was true)
}
```
System.Management.Automation.RemoteException
### `OccupancyRect`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```
System.Management.Automation.RemoteException
Rectangular footprint used for buildings and other multi-tile claims.
System.Management.Automation.RemoteException
### `OccupancyArea`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
type OccupancyArea = OccupancyRect | ReadonlyArray<Position>;
```
System.Management.Automation.RemoteException
Area input accepted by occupancy APIs. Use a rectangle for dense footprints or a list of positions for arbitrary shapes.
System.Management.Automation.RemoteException
### `OccupancyQueryOptions`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyQueryOptions {
  ignoreEntity?: EntityId;
  includeReservations?: boolean;
}
```
System.Management.Automation.RemoteException
Options for occupancy checks. `ignoreEntity` is useful when checking whether a moving entity can continue through its current footprint.
System.Management.Automation.RemoteException
### `GridPassability`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface GridPassability {
  readonly width: number;
  readonly height: number;
  readonly version: number;
  isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean;
}
```
System.Management.Automation.RemoteException
Minimal passability surface used by `findGridPath()`. `OccupancyGrid` and `OccupancyBinding` both satisfy this contract.
System.Management.Automation.RemoteException
### `OccupancyGridState`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyGridState {
  width: number;
  height: number;
  blocked: number[];
  occupied: Array<[EntityId, number[]]>;
  reservations: Array<[EntityId, number[]]>;
  version: number;
}
```
System.Management.Automation.RemoteException
Serializable occupancy snapshot used by `OccupancyGrid.getState()` and `OccupancyGrid.fromState()`.
System.Management.Automation.RemoteException
### `OccupancyGridMetrics`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyGridMetrics {
  blockedQueries: number;
  blockedCellChecks: number;
  claimQueries: number;
  claimCellChecks: number;
  areaNormalizations: number;
  normalizedCellCount: number;
  stateSnapshots: number;
}
```
System.Management.Automation.RemoteException
Runtime scan counters for `OccupancyGrid`. Useful for benchmark harnesses and game-side performance diagnostics.
System.Management.Automation.RemoteException
### `SubcellSlotOffset`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellSlotOffset {
  x: number;
  y: number;
}
```
System.Management.Automation.RemoteException
Relative offset inside one integer cell. The default `SubcellOccupancyGrid` layout uses four quarter-cell offsets.
System.Management.Automation.RemoteException
### `SubcellPlacement`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellPlacement {
  position: Position;
  slot: number;
  offset: SubcellSlotOffset;
}
```
System.Management.Automation.RemoteException
Resolved slot assignment for one entity in one cell. Returned by `bestSlotForUnit()`, `occupy()`, and `getOccupiedPlacement()`.
System.Management.Automation.RemoteException
### `SubcellNeighborSpace`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellNeighborSpace {
  position: Position;
  freeSlots: number;
  bestSlot: SubcellPlacement;
}
```
System.Management.Automation.RemoteException
Neighbor cell with remaining crowding capacity. Returned by `neighborsWithSpace()`.
System.Management.Automation.RemoteException
### `SubcellOccupancyOptions`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyOptions extends OccupancyQueryOptions {
  preferredSlot?: number;
  preferredOffset?: SubcellSlotOffset;
}
```
System.Management.Automation.RemoteException
Options for slot-based crowding queries. `preferredSlot` biases toward one slot index; `preferredOffset` biases toward the nearest slot geometry inside the cell.
System.Management.Automation.RemoteException
### `SubcellNeighborOptions`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellNeighborOptions extends SubcellOccupancyOptions {
  offsets?: ReadonlyArray<Position>;
}
```
System.Management.Automation.RemoteException
Neighbor-query options for `SubcellOccupancyGrid.neighborsWithSpace()`. Defaults to cardinal neighbor offsets.
System.Management.Automation.RemoteException
### `SubcellOccupancyGridOptions`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyGridOptions {
  slots?: ReadonlyArray<SubcellSlotOffset>;
  isCellBlocked?: (
    x: number,
    y: number,
    options?: OccupancyQueryOptions,
  ) => boolean;
}
```
System.Management.Automation.RemoteException
Constructor options for `SubcellOccupancyGrid`. Use `slots` to define a custom packing layout, and `isCellBlocked` to consult whole-cell blockers such as `OccupancyGrid`, terrain, or scenario rules.
System.Management.Automation.RemoteException
### `SubcellOccupancyGridState`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyGridState {
  width: number;
  height: number;
  slots: SubcellSlotOffset[];
  occupied: Array<[EntityId, { cell: number; slot: number }]>;
  version: number;
}
```
System.Management.Automation.RemoteException
Serializable slot-crowding snapshot used by `SubcellOccupancyGrid.getState()` and `SubcellOccupancyGrid.fromState()`.
System.Management.Automation.RemoteException
### `SubcellOccupancyGridMetrics`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyGridMetrics {
  placementQueries: number;
  blockedQueries: number;
  blockedCellChecks: number;
  slotChecks: number;
  neighborQueries: number;
  neighborCellChecks: number;
  freeSlotQueries: number;
  freeSlotChecks: number;
  stateSnapshots: number;
}
```
System.Management.Automation.RemoteException
Runtime scan counters for `SubcellOccupancyGrid`.
System.Management.Automation.RemoteException
### `OccupancyMetadata`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyMetadata {
  kind: string;
}
```
System.Management.Automation.RemoteException
Minimal blocker metadata carried by `OccupancyBinding`. Use `kind` for repo-level distinctions such as `building`, `resource`, `unit`, or `terrain`.
System.Management.Automation.RemoteException
### `OccupancyCellClaim`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyCellClaim {
  entity: EntityId | null;
  kind: string;
  claim: 'blocked' | 'occupied' | 'reserved' | 'subcell';
  slot?: number;
  offset?: SubcellSlotOffset;
}
```
System.Management.Automation.RemoteException
One occupancy or crowding claim returned by `OccupancyBinding.getCellStatus()`.
System.Management.Automation.RemoteException
### `OccupancyCellStatus`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyCellStatus {
  position: Position;
  blocked: boolean;
  blockedBy: OccupancyCellClaim[];
  crowdedBy: OccupancyCellClaim[];
  freeSubcellSlots: number | null;
}
```
System.Management.Automation.RemoteException
Combined whole-cell and sub-cell view for one cell. `blockedBy` carries building/resource/unit-style metadata without requiring multiple parallel grids, while `blocked` also flips to `true` when sub-cell crowding has no free slots left for the query.
System.Management.Automation.RemoteException
### `OccupancyBindingClaimOptions`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyBindingClaimOptions {
  metadata?: OccupancyMetadata;
}
```
System.Management.Automation.RemoteException
Metadata wrapper used by `OccupancyBinding.block()`, `occupy()`, and `reserve()`.
System.Management.Automation.RemoteException
### `OccupancyBindingSubcellOptions`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyBindingSubcellOptions extends SubcellOccupancyOptions {
  metadata?: OccupancyMetadata;
}
```
System.Management.Automation.RemoteException
Sub-cell crowding options plus optional blocker metadata for `OccupancyBinding`.
System.Management.Automation.RemoteException
### `OccupancyBindingWorldHooks`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyBindingWorldHooks {
  onDestroy(callback: (id: EntityId, world: unknown) => void): void;
  offDestroy(callback: (id: EntityId, world: unknown) => void): void;
}
```
System.Management.Automation.RemoteException
Minimal destroy-hook contract accepted by `OccupancyBinding.attachWorld()` and the constructor `world` option.
System.Management.Automation.RemoteException
### `OccupancyBindingOptions`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyBindingOptions {
  crowding?: false | SubcellOccupancyGridOptions;
  world?: OccupancyBindingWorldHooks;
}
```
System.Management.Automation.RemoteException
Constructor options for `OccupancyBinding`. Crowd tracking is enabled by default; pass `crowding: false` to disable sub-cell APIs.
System.Management.Automation.RemoteException
### `OccupancyBindingMetrics`
System.Management.Automation.RemoteException
```typescript
// src/occupancy-grid.ts
interface OccupancyBindingMetrics {
  version: number;
  cellStatusQueries: number;
  crowdedSlotChecks: number;
  occupancy: OccupancyGridMetrics;
  crowding: SubcellOccupancyGridMetrics | null;
}
```
System.Management.Automation.RemoteException
Aggregate metrics returned by `OccupancyBinding.getMetrics()`.
System.Management.Automation.RemoteException
### `GridPathConfig`
System.Management.Automation.RemoteException
```typescript
// src/path-service.ts
interface GridPathConfig {
  start: Position;
  goal: Position;
  width?: number;
  height?: number;
  occupancy?: GridPassability;
  movingEntity?: EntityId;
  includeReservations?: boolean;
  allowDiagonal?: boolean;
  preventCornerCutting?: boolean;
  blocked?: (x: number, y: number) => boolean;
  cost?: (from: Position, to: Position) => number;
  heuristic?: (node: Position, goal: Position) => number;
  maxCost?: number;
  maxIterations?: number;
  trackExplored?: boolean;
}
```
System.Management.Automation.RemoteException
Configuration for `findGridPath()`. Supply `width` and `height` directly, or pass any `GridPassability` implementation (`OccupancyGrid`, `OccupancyBinding`, or your own) and dimensions are inferred.
System.Management.Automation.RemoteException
### `GridPathRequest`
System.Management.Automation.RemoteException
```typescript
// src/path-service.ts
interface GridPathRequest extends GridPathConfig {
  passabilityVersion?: number;
  cacheKey?: string;
}
```
System.Management.Automation.RemoteException
Request shape accepted by `PathRequestQueue` when used through `createGridPathQueue()`. `passabilityVersion` lets callers invalidate cached results when custom passability rules change.
System.Management.Automation.RemoteException
### `PathRequestQueueEntry<TRequest, TResult>`
System.Management.Automation.RemoteException
```typescript
// src/path-service.ts
interface PathRequestQueueEntry<TRequest, TResult> {
  id: number;
  request: TRequest;
  result: TResult;
  fromCache: boolean;
}
```
System.Management.Automation.RemoteException
Completed queue entry returned from `process()`.
System.Management.Automation.RemoteException
### `PathRequestQueueStats`
System.Management.Automation.RemoteException
```typescript
// src/path-service.ts
interface PathRequestQueueStats {
  enqueued: number;
  processed: number;
  cacheHits: number;
  cacheMisses: number;
  pending: number;
  cacheSize: number;
}
```
System.Management.Automation.RemoteException
Queue counters returned by `PathRequestQueue.getStats()`.
System.Management.Automation.RemoteException
### `PathRequestQueueOptions<TRequest, TResult>`
System.Management.Automation.RemoteException
```typescript
// src/path-service.ts
interface PathRequestQueueOptions<TRequest, TResult> {
  resolve: (request: TRequest) => TResult;
  cacheKey?: (request: TRequest) => string | undefined;
  passabilityVersion?: (request: TRequest) => number;
  cloneResult?: (result: TResult) => TResult;
}
```
System.Management.Automation.RemoteException
Constructor options for the generic deterministic request queue.
System.Management.Automation.RemoteException
### `VisibilityPlayerId`
System.Management.Automation.RemoteException
```typescript
// src/visibility-map.ts
type VisibilityPlayerId = number | string;
```
System.Management.Automation.RemoteException
Player key used by `VisibilityMap`.
System.Management.Automation.RemoteException
### `VisionSourceId`
System.Management.Automation.RemoteException
```typescript
// src/visibility-map.ts
type VisionSourceId = number | string;
```
System.Management.Automation.RemoteException
Identifier for an individual vision source within one player's visibility state.
System.Management.Automation.RemoteException
### `VisionSource`
System.Management.Automation.RemoteException
```typescript
// src/visibility-map.ts
interface VisionSource {
  x: number;
  y: number;
  radius: number;
}
```
System.Management.Automation.RemoteException
Circular reveal source used by `VisibilityMap`.
System.Management.Automation.RemoteException
### `VisibilityMapState`
System.Management.Automation.RemoteException
```typescript
// src/visibility-map.ts
interface VisibilityMapState {
  width: number;
  height: number;
  players: Array<
    [
      VisibilityPlayerId,
      {
        sources: Array<[VisionSourceId, VisionSource]>;
        explored: number[];
      },
    ]
  >;
}
```
System.Management.Automation.RemoteException
Serializable visibility snapshot used by `VisibilityMap.getState()` and `VisibilityMap.fromState()`.
System.Management.Automation.RemoteException
### `CellGrid`
System.Management.Automation.RemoteException
```typescript
// src/cellular.ts
type CellGrid = {
  readonly width: number;
  readonly height: number;
  readonly cells: number[];   // Flat array, indexed as y * width + x
};
```
System.Management.Automation.RemoteException
### `CellRule`
System.Management.Automation.RemoteException
```typescript
// src/cellular.ts
type CellRule = (current: number, neighbors: number[]) => number;
```
System.Management.Automation.RemoteException
A function that determines a cell's next value based on its current value and its neighbors' values.
System.Management.Automation.RemoteException
### `MapGenerator`
System.Management.Automation.RemoteException
```typescript
// src/map-gen.ts
interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}
```
System.Management.Automation.RemoteException
Interface for map generators. Receives the world and the tile entity grid from `createTileGrid`.
System.Management.Automation.RemoteException
### `NodeStatus`
System.Management.Automation.RemoteException
```typescript
// src/behavior-tree.ts
enum NodeStatus {
  SUCCESS,   // 0 - Node completed successfully
  FAILURE,   // 1 - Node failed
  RUNNING,   // 2 - Node needs more ticks to complete
}
```
System.Management.Automation.RemoteException
### `BTState`
System.Management.Automation.RemoteException
```typescript
// src/behavior-tree.ts
interface BTState {
  running: number[];  // Per-node index tracking which child is running (-1 = none)
}
```
System.Management.Automation.RemoteException
Serializable behavior tree execution state. Store this as a component on entities. The `running` array has one slot per node in the tree, tracking which child a composite node should resume from.
System.Management.Automation.RemoteException
### `TreeBuilder<TContext>`
System.Management.Automation.RemoteException
```typescript
// src/behavior-tree.ts
interface TreeBuilder<TContext> {
  action(fn: (ctx: TContext) => NodeStatus): BTNode<TContext>;
  condition(fn: (ctx: TContext) => boolean): BTNode<TContext>;
  selector(children: BTNode<TContext>[]): BTNode<TContext>;
  sequence(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSelector(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSequence(children: BTNode<TContext>[]): BTNode<TContext>;
}
```
System.Management.Automation.RemoteException
Builder object passed to the `createBehaviorTree` define callback. Used to construct tree nodes.
System.Management.Automation.RemoteException
### `GameEvent<TEventMap>`
System.Management.Automation.RemoteException
```typescript
// src/client-adapter.ts
type GameEvent<TEventMap> = {
  type: keyof TEventMap;
  data: TEventMap[keyof TEventMap];
};
```
System.Management.Automation.RemoteException
### `ServerMessage<TEventMap>`
System.Management.Automation.RemoteException
```typescript
// src/client-adapter.ts
type ServerMessage<TEventMap> =
  | { protocolVersion: number; type: 'snapshot'; data: WorldSnapshot }
  | { protocolVersion: number; type: 'tick'; data: { diff: TickDiff; events: GameEvent<TEventMap>[] } }
  | {
      protocolVersion: number;
      type: 'commandAccepted';
      data: { id: string; commandType: string; code: 'accepted'; message: string };
    }
  | {
      protocolVersion: number;
      type: 'commandRejected';
      data: {
        id: string;
        commandType: string | null;
        code: string;
        message: string;
        details: JsonValue | null;
        validatorIndex: number | null;
      };
    }
  | {
      protocolVersion: number;
      type: 'commandExecuted';
      data: {
        id: string;
        commandType: string;
        submissionSequence: number | null;
        code: string;
        message: string;
        details: JsonValue | null;
        tick: number;
      };
    }
  | {
      protocolVersion: number;
      type: 'commandFailed';
      data: {
        id: string;
        commandType: string;
        submissionSequence: number | null;
        code: string;
        message: string;
        details: JsonValue | null;
        tick: number;
      };
    }
  | {
      protocolVersion: number;
      type: 'tickFailed';
      data: TickFailure;
    };
```
System.Management.Automation.RemoteException
Messages sent from server to client:
System.Management.Automation.RemoteException
| Type | When sent | Payload |
|---|---|---|
| `snapshot` | On `connect()` or `requestSnapshot` | `protocolVersion` + full `WorldSnapshot` |
| `tick` | After each `step()` while connected | `protocolVersion` + `TickDiff` + events from the tick |
| `commandAccepted` | When a submitted command passed validation and was queued | `protocolVersion` + command ID + command type + accepted message |
| `commandRejected` | When the adapter rejects a malformed, unhandled, or validation-failed command | `protocolVersion` + command ID + command type + stable code/message/details |
| `commandExecuted` | When a queued client command completes during a tick | `protocolVersion` + command ID + command type + submission sequence + execution code/message/details + tick |
| `commandFailed` | When a queued client command fails during a tick | `protocolVersion` + command ID + command type + submission sequence + failure code/message/details + tick |
| `tickFailed` | When the world reports a structured tick failure | `protocolVersion` + `TickFailure` |
System.Management.Automation.RemoteException
### `ClientMessage<TCommandMap>`
System.Management.Automation.RemoteException
```typescript
// src/client-adapter.ts
type ClientMessage<TCommandMap> =
  | { protocolVersion?: number; type: 'command'; data: { id: string; commandType: keyof TCommandMap; payload: TCommandMap[keyof TCommandMap] } }
  | { protocolVersion?: number; type: 'requestSnapshot' };
```
System.Management.Automation.RemoteException
Messages sent from client to server:
System.Management.Automation.RemoteException
| Type | Purpose | Payload |
|---|---|---|
| `command` | Submit a game command | Optional `protocolVersion`, command ID, type, and payload |
| `requestSnapshot` | Request a full state resync | Optional `protocolVersion` |
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## World
System.Management.Automation.RemoteException
`World<TEventMap, TCommandMap, TComponents>` is the top-level API and the only public entry point. All subsystems (entity manager, component stores, spatial grid, game loop, event bus, command queue, resource store) are owned as private fields.
System.Management.Automation.RemoteException
```typescript
import { World } from 'civ-engine';
```
System.Management.Automation.RemoteException
### Type Parameters
System.Management.Automation.RemoteException
| Parameter | Constraint | Default | Description |
|---|---|---|---|
| `TEventMap` | `Record<keyof TEventMap, unknown>` | `Record<string, never>` | Map of event type names to event data types |
| `TCommandMap` | `Record<keyof TCommandMap, unknown>` | `Record<string, never>` | Map of command type names to command data types |
| `TComponents` | `ComponentRegistry` | `Record<string, unknown>` | Optional component registry. When specified, component methods infer value types from registry keys |
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new World<TEventMap, TCommandMap, TComponents>(config: WorldConfig)
```
System.Management.Automation.RemoteException
Creates a new world with the specified grid dimensions, tick rate, and optional configuration.
System.Management.Automation.RemoteException
**Parameters:**
System.Management.Automation.RemoteException
| Name | Type | Required | Description |
|---|---|---|---|
| `config.gridWidth` | `number` | Yes | Width of the spatial grid in cells |
| `config.gridHeight` | `number` | Yes | Height of the spatial grid in cells |
| `config.tps` | `number` | Yes | Ticks per second for the real-time loop |
| `config.positionKey` | `string` | No | Component key used for spatial grid sync (default: `'position'`) |
| `config.maxTicksPerFrame` | `number` | No | Maximum ticks processed per real-time frame before discarding accumulated time (default: `4`) |
| `config.seed` | `number \| string` | No | Seed for deterministic `world.random()` sequences |
System.Management.Automation.RemoteException
**Example:**
System.Management.Automation.RemoteException
```typescript
const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10 });
```
System.Management.Automation.RemoteException
### Entity Management
System.Management.Automation.RemoteException
#### `createEntity()`
System.Management.Automation.RemoteException
```typescript
createEntity(): EntityId
```
System.Management.Automation.RemoteException
Creates a new entity and returns its ID. IDs are recycled from previously destroyed entities via a free-list. Entity IDs start at `0` and increment.
System.Management.Automation.RemoteException
**Returns:** `EntityId` ╞Æ?" the new entity's numeric ID.
System.Management.Automation.RemoteException
```typescript
const unit = world.createEntity(); // 0
const building = world.createEntity(); // 1
```
System.Management.Automation.RemoteException
#### `destroyEntity(id)`
System.Management.Automation.RemoteException
```typescript
destroyEntity(id: EntityId): void
```
System.Management.Automation.RemoteException
Immediately destroys an entity. Performs full cleanup in this order:
System.Management.Automation.RemoteException
1. Fires all `onDestroy` callbacks (with components still attached)
2. Removes entity from the spatial grid using its last-synced position
3. Removes all components from all stores
4. Removes all resource pools, production rates, consumption rates, and transfers
5. Removes all tags and metadata associated with the entity
6. Marks the entity as dead in the entity manager (ID becomes available for recycling)
System.Management.Automation.RemoteException
**No-op** if the entity is already dead.
System.Management.Automation.RemoteException
```typescript
world.destroyEntity(unit);
world.isAlive(unit); // false
```
System.Management.Automation.RemoteException
#### `isAlive(id)`
System.Management.Automation.RemoteException
```typescript
isAlive(id: EntityId): boolean
```
System.Management.Automation.RemoteException
Returns `true` if the entity exists and has not been destroyed. Returns `false` for IDs that were never created or have been destroyed.
System.Management.Automation.RemoteException
```typescript
const e = world.createEntity();
world.isAlive(e);    // true
world.destroyEntity(e);
world.isAlive(e);    // false
world.isAlive(999);  // false
```
System.Management.Automation.RemoteException
#### `getEntityRef(id)`
System.Management.Automation.RemoteException
```typescript
getEntityRef(id: EntityId): EntityRef | null
```
System.Management.Automation.RemoteException
Returns a generation-aware reference for a live entity, or `null` if the entity is not alive.
System.Management.Automation.RemoteException
#### `isCurrent(ref)`
System.Management.Automation.RemoteException
```typescript
isCurrent(ref: EntityRef): boolean
```
System.Management.Automation.RemoteException
Returns `true` only if the referenced entity ID is alive and still has the same generation.
System.Management.Automation.RemoteException
#### `getAliveEntities()`
System.Management.Automation.RemoteException
```typescript
getAliveEntities(): IterableIterator<EntityId>
```
System.Management.Automation.RemoteException
Yields every live entity id in ascending order. Cheaper than reading `world.serialize().entities.alive` when you only need to iterate the set (no JSON-compat walk on component data). Useful for renderer adapters connecting mid-session.
System.Management.Automation.RemoteException
#### `getEntityGeneration(id)`
System.Management.Automation.RemoteException
```typescript
getEntityGeneration(id: EntityId): number
```
System.Management.Automation.RemoteException
Returns the current generation counter for the given entity id. Combined with `getAliveEntities()` lets a caller build `EntityRef` objects without going through `getEntityRef` per entity.
System.Management.Automation.RemoteException
### Components
System.Management.Automation.RemoteException
#### `registerComponent<T>(key, options?)`
System.Management.Automation.RemoteException
```typescript
registerComponent<T>(key: string, options?: ComponentOptions): void
System.Management.Automation.RemoteException
interface ComponentOptions {
  diffMode?: 'strict' | 'semantic';
}
```
System.Management.Automation.RemoteException
Registers a component type by string key. Must be called before using `addComponent`, `getComponent`, `removeComponent`, or `query` with this key.
System.Management.Automation.RemoteException
`options.diffMode` controls how component writes participate in `TickDiff`:
- `'strict'` (default) ╞Æ?" every `addComponent` / `setComponent` call marks the entity dirty, even if the new value is identical to the prior value. Preserves per-write audit semantics.
- `'semantic'` ╞Æ?" writes are fingerprinted against the baseline from the last tick; identical rewrites do not mark the entity dirty. Use this for components whose sync systems rewrite unchanged values every tick (e.g. `position`, `transform`) to keep `TickDiff` liveness signals high.
System.Management.Automation.RemoteException
In-place mutations of component objects (`world.getComponent(id, 'foo').x = 5`) are NOT tracked by the diff system. Game code must call `setComponent`/`addComponent`/`patchComponent` for changes to land in the diff. The dirty set is updated only by the explicit write APIs.
System.Management.Automation.RemoteException
`options.diffMode` is round-tripped in v5 snapshots so save/load preserves component-store behavior.
System.Management.Automation.RemoteException
**Throws:** `Error` if a component with this key is already registered.
System.Management.Automation.RemoteException
```typescript
interface Health { hp: number; maxHp: number }
world.registerComponent<Health>('health');
System.Management.Automation.RemoteException
interface Transform { x: number; y: number }
world.registerComponent<Transform>('transform', { diffMode: 'semantic' });
```
System.Management.Automation.RemoteException
#### `addComponent<T>(entity, key, data)`
System.Management.Automation.RemoteException
```typescript
addComponent<T>(entity: EntityId, key: string, data: T): void
```
System.Management.Automation.RemoteException
Attaches a component to an entity. If the entity already has this component, it is overwritten.
System.Management.Automation.RemoteException
**Throws:** `Error` if the entity is not alive, the component key is not registered, or the data is not JSON-compatible.
System.Management.Automation.RemoteException
```typescript
world.addComponent(unit, 'health', { hp: 100, maxHp: 100 });
```
System.Management.Automation.RemoteException
`addComponent` is kept as a compatibility alias for `setComponent`.
System.Management.Automation.RemoteException
#### `setComponent<T>(entity, key, data)`
System.Management.Automation.RemoteException
```typescript
setComponent<T>(entity: EntityId, key: string, data: T): void
```
System.Management.Automation.RemoteException
Sets or replaces a component, marks it dirty for diffs, and updates the spatial grid immediately when `key` is the world's `positionKey`.
System.Management.Automation.RemoteException
#### `patchComponent<T>(entity, key, fn)`
System.Management.Automation.RemoteException
```typescript
patchComponent<T>(
  entity: EntityId,
  key: string,
  patch: (data: T) => T | void,
): T
```
System.Management.Automation.RemoteException
Reads an existing component, lets the callback mutate it or return a replacement, then marks it dirty.
System.Management.Automation.RemoteException
#### `setPosition(entity, position, key?)`
System.Management.Automation.RemoteException
```typescript
setPosition(entity: EntityId, position: Position, key?: string): void
```
System.Management.Automation.RemoteException
Sets position data and updates the spatial grid immediately when the key is the world's `positionKey`.
System.Management.Automation.RemoteException
#### `getComponent<T>(entity, key)`
System.Management.Automation.RemoteException
```typescript
getComponent<T>(entity: EntityId, key: string): T | undefined
```
System.Management.Automation.RemoteException
Returns the component data for the given entity and key, or `undefined` if the entity does not have this component. The returned object is a direct reference, so mutations are reflected immediately. Direct mutations are detected for diffs, but `setComponent()` and `patchComponent()` are the preferred write APIs for clearer intent and immediate position/grid synchronization.
System.Management.Automation.RemoteException
```typescript
const hp = world.getComponent<Health>(unit, 'health');
if (hp) {
  hp.hp -= 10; // mutate in-place
}
```
System.Management.Automation.RemoteException
#### `getComponents<T>(entity, keys)`
System.Management.Automation.RemoteException
```typescript
getComponents<T extends unknown[]>(entity: EntityId, keys: string[]): ComponentTuple<T>
```
System.Management.Automation.RemoteException
Batch-reads multiple components for a single entity. Returns a tuple where each element is the component data or `undefined`. More concise than multiple `getComponent` calls.
System.Management.Automation.RemoteException
**Type:** `ComponentTuple<T>` is `{ [K in keyof T]: T[K] | undefined }`.
System.Management.Automation.RemoteException
```typescript
const [pos, hp, vel] = world.getComponents<[Position, Health, Velocity]>(
  unit,
  ['position', 'health', 'velocity'],
);
// pos: Position | undefined
// hp: Health | undefined
// vel: Velocity | undefined
```
System.Management.Automation.RemoteException
#### `removeComponent(entity, key)`
System.Management.Automation.RemoteException
```typescript
removeComponent(entity: EntityId, key: string): void
```
System.Management.Automation.RemoteException
Detaches a component from an entity. No-op if the entity doesn't have this component.
System.Management.Automation.RemoteException
```typescript
world.removeComponent(unit, 'velocity');
```
System.Management.Automation.RemoteException
#### `query(...keys)`
System.Management.Automation.RemoteException
```typescript
*query(...keys: string[]): IterableIterator<EntityId>
```
System.Management.Automation.RemoteException
Returns an iterator over all entity IDs that have **every** specified component. Query membership is cached by component signature and updated as components are added, removed, or entities are destroyed.
System.Management.Automation.RemoteException
**Throws:** `Error` if any component key is not registered.
System.Management.Automation.RemoteException
Returns immediately (yields nothing) if `keys` is empty.
System.Management.Automation.RemoteException
```typescript
// Iterate
for (const id of world.query('position', 'health')) {
  // id has both 'position' and 'health'
}
System.Management.Automation.RemoteException
// Collect to array
const soldiers = [...world.query('position', 'health', 'attack')];
```
System.Management.Automation.RemoteException
### Systems & Simulation
System.Management.Automation.RemoteException
#### `registerSystem(fnOrConfig)`
System.Management.Automation.RemoteException
```typescript
registerSystem(
  system:
    | System<TEventMap, TCommandMap>
    | SystemRegistration<TEventMap, TCommandMap>
    | LooseSystem
    | LooseSystemRegistration,
): void
```
System.Management.Automation.RemoteException
Adds a system to the pipeline. Bare functions run in the `update` phase. Registration objects can name systems for metrics and assign a phase. Systems run in this phase order: `input`, `preUpdate`, `update`, `postUpdate`, `output`; registration order is preserved within each phase.
System.Management.Automation.RemoteException
The overload accepting `LooseSystem | LooseSystemRegistration` allows systems typed against `World<any, any>` to be registered without casts, which is useful for generic utility systems.
System.Management.Automation.RemoteException
**Ordering constraints:** `SystemRegistration` (and `LooseSystemRegistration`) support optional `before` and `after` arrays to declare ordering dependencies between named systems within the same phase. Constraints are resolved via topological sort.
System.Management.Automation.RemoteException
| Field | Type | Description |
|---|---|---|
| `before` | `string[]` | Run this system before the named systems |
| `after` | `string[]` | Run this system after the named systems |
| `interval` | `number` | Run only on ticks where `(executingTick - 1) % interval === intervalOffset` (default `1`) |
| `intervalOffset` | `number` | Cycle offset within `[0, interval)` (default `0`); shifts which absolute tick number triggers the system within the modulo cycle |
System.Management.Automation.RemoteException
**Throws:**
- `Error` if a constraint creates a cycle within a phase
- `Error` if a constraint references a system in a different phase
- `Error` if a constraint references a non-existent system name
- `Error` if `interval` is not a safe integer >= 1
- `Error` if `intervalOffset` is not a safe integer in `[0, interval)`
System.Management.Automation.RemoteException
```typescript
function movementSystem(w: World): void {
  for (const id of w.query('position', 'velocity')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const vel = w.getComponent<Velocity>(id, 'velocity')!;
    w.setPosition(id, { x: pos.x + vel.dx, y: pos.y + vel.dy });
  }
}
System.Management.Automation.RemoteException
world.registerSystem(movementSystem);
world.registerSystem({
  name: 'Combat',
  phase: 'postUpdate',
  execute: combatSystem,
});
System.Management.Automation.RemoteException
// Ordering: Movement runs before Combat within the same phase
world.registerSystem({
  name: 'Movement',
  phase: 'update',
  before: ['Collision'],
  execute: movementSystem,
});
world.registerSystem({
  name: 'Collision',
  phase: 'update',
  after: ['Movement'],
  execute: collisionSystem,
});
System.Management.Automation.RemoteException
// Cadence: heavy weather sim runs every 12 ticks (fires at tick 1, 13, 25, ...)
world.registerSystem({
  name: 'Weather',
  phase: 'update',
  interval: 12,
  execute: weatherSystem,
});
System.Management.Automation.RemoteException
// Stagger: two interval-2 systems on alternating ticks
world.registerSystem({ name: 'A', execute: a, interval: 2, intervalOffset: 0 }); // ticks 1, 3, 5
world.registerSystem({ name: 'B', execute: b, interval: 2, intervalOffset: 1 }); // ticks 2, 4, 6
```
System.Management.Automation.RemoteException
#### `step()`
System.Management.Automation.RemoteException
```typescript
step(): void
```
System.Management.Automation.RemoteException
Advances the simulation by exactly one tick. **Deterministic** ╞Æ?" ignores pause state and speed multiplier. This is the primary method for testing and AI-driven simulations.
System.Management.Automation.RemoteException
Each tick executes in this order:
System.Management.Automation.RemoteException
1. Clear event buffer
2. Clear dirty flags (entities, components, resources)
3. Process commands (drain queue, run handlers)
4. Run systems (`input`, `preUpdate`, `update`, `postUpdate`, `output`); periodic systems gated by their `interval` / `intervalOffset` are skipped on non-firing ticks
5. Process resource rates and transfers
6. Build diff (collect dirty state into `TickDiff`)
7. Update metrics
8. Notify diff listeners
9. Increment tick counter
System.Management.Automation.RemoteException
The spatial grid is updated lock-step with every position write (`setPosition`, `setComponent` on the configured position key) ╞Æ?" there is no separate sync phase.
System.Management.Automation.RemoteException
```typescript
world.step(); // always executes, even when paused
```
System.Management.Automation.RemoteException
**Throws:** `WorldTickFailureError` if the tick fails at runtime.
System.Management.Automation.RemoteException
When `instrumentationProfile` is `'minimal'`, `step()` records only coarse implicit metrics. When it is `'release'`, `step()` skips implicit per-tick metrics collection entirely. Use `stepWithResult()` when the caller explicitly wants structured runtime diagnostics.
System.Management.Automation.RemoteException
#### `stepWithResult()`
System.Management.Automation.RemoteException
```typescript
stepWithResult(): WorldStepResult
```
System.Management.Automation.RemoteException
Advances the simulation by exactly one tick and returns a structured success/failure result instead of throwing on runtime failure. This is the preferred stepping API for AI loops and remote harnesses.
System.Management.Automation.RemoteException
If the world is poisoned (a previous tick failed and `recover()` has not been called), `stepWithResult()` immediately returns `{ ok: false, failure: { code: 'world_poisoned', ... } }` without attempting another tick.
System.Management.Automation.RemoteException
#### `isPoisoned()`
System.Management.Automation.RemoteException
```typescript
isPoisoned(): boolean
```
System.Management.Automation.RemoteException
Returns `true` while the world is in a post-failure poisoned state. Cleared by `recover()`. See Tick failure semantics.
System.Management.Automation.RemoteException
#### `recover()`
System.Management.Automation.RemoteException
```typescript
recover(): void
```
System.Management.Automation.RemoteException
Clears the poison flag along with cached `lastTickFailure`, `currentDiff`, and `currentMetrics`. After `recover()` the world is safe to step again. The next successful tick uses a tick number one greater than the failed tick (failed ticks consume their tick number).
System.Management.Automation.RemoteException
```typescript
try {
  world.step();
} catch (err) {
  if (err instanceof WorldTickFailureError) {
    console.error('tick failed:', err.failure);
    world.recover();
  }
}
world.step(); // safe again
```
System.Management.Automation.RemoteException
#### `warnIfPoisoned(api)`
System.Management.Automation.RemoteException
```typescript
warnIfPoisoned(api: string): void
```
System.Management.Automation.RemoteException
Emits a `console.warn` once per poison cycle if the world is poisoned (a prior tick failed and `recover()` has not been called). The warning identifies which API surface the caller routed through (`api='submit'`, `api='serialize'`, `api='transaction'`, etc.) so log readers can correlate the warning with the offending call site. Subsequent calls within the same poison cycle are silent; once `recover()` clears the poison, the next `warnIfPoisoned` call after a future failure will warn again.
System.Management.Automation.RemoteException
This is the integration point used by `submitWithResult`, `serialize`, and `CommandTransaction.commit` to surface "you forgot to recover" without blocking the call. Any new write surface should call this with its own `api` tag for consistency with the rest of the engine.
System.Management.Automation.RemoteException
```typescript
world.warnIfPoisoned('myCustomCommand');
// ╞Æ+' "myCustomCommand called on a poisoned world (last failure: 'system_threw' at tick 5). Call world.recover() to clear the poison flag."
```
System.Management.Automation.RemoteException
#### `start()`
System.Management.Automation.RemoteException
```typescript
start(): void
```
System.Management.Automation.RemoteException
Begins the real-time loop. Ticks accumulate based on elapsed time and the configured TPS. Uses a fixed-timestep algorithm with spiral-of-death protection (controlled by `maxTicksPerFrame`).
System.Management.Automation.RemoteException
```typescript
world.start(); // begins ticking at TPS rate
```
System.Management.Automation.RemoteException
#### `stop()`
System.Management.Automation.RemoteException
```typescript
stop(): void
```
System.Management.Automation.RemoteException
Stops the real-time loop. The tick counter is preserved.
System.Management.Automation.RemoteException
```typescript
world.stop();
```
System.Management.Automation.RemoteException
#### `tick`
System.Management.Automation.RemoteException
```typescript
get tick(): number
```
System.Management.Automation.RemoteException
Read-only property returning the current tick count. Starts at `0`, increments by 1 after each tick.
System.Management.Automation.RemoteException
```typescript
console.log(world.tick); // 0
world.step();
console.log(world.tick); // 1
```
System.Management.Automation.RemoteException
#### `grid`
System.Management.Automation.RemoteException
```typescript
readonly grid: SpatialGrid
```
System.Management.Automation.RemoteException
Read-only reference to the spatial grid. Use `grid.getAt()` and `grid.getNeighbors()` to query spatial data. Do not call `grid.insert()`, `grid.remove()`, or `grid.move()` directly ╞Æ?" the World handles spatial sync automatically.
System.Management.Automation.RemoteException
### Speed Control
System.Management.Automation.RemoteException
#### `setSpeed(multiplier)`
System.Management.Automation.RemoteException
```typescript
setSpeed(multiplier: number): void
```
System.Management.Automation.RemoteException
Sets the simulation speed multiplier for the real-time loop. `2` means ticks accumulate twice as fast. `0.5` means half speed. Has no effect on `step()`.
System.Management.Automation.RemoteException
**Throws:** `Error` if `multiplier` is not a finite positive number (rejects `0`, negative, `NaN`, `Infinity`).
System.Management.Automation.RemoteException
```typescript
world.setSpeed(2);    // double speed
world.setSpeed(0.5);  // half speed
```
System.Management.Automation.RemoteException
#### `getSpeed()`
System.Management.Automation.RemoteException
```typescript
getSpeed(): number
```
System.Management.Automation.RemoteException
Returns the current speed multiplier. Default is `1`.
System.Management.Automation.RemoteException
#### `pause()`
System.Management.Automation.RemoteException
```typescript
pause(): void
```
System.Management.Automation.RemoteException
Pauses the real-time loop. The speed multiplier is preserved. `step()` still works while paused.
System.Management.Automation.RemoteException
#### `resume()`
System.Management.Automation.RemoteException
```typescript
resume(): void
```
System.Management.Automation.RemoteException
Resumes the real-time loop at the current speed multiplier. Resets the time accumulator to prevent a burst of ticks.
System.Management.Automation.RemoteException
#### `isPaused`
System.Management.Automation.RemoteException
```typescript
get isPaused(): boolean
```
System.Management.Automation.RemoteException
Read-only property. `true` when the simulation is paused.
System.Management.Automation.RemoteException
### Commands
System.Management.Automation.RemoteException
Commands are validated-and-queued input from external code (AI agents, UI). They are processed at the start of each tick, before spatial sync and systems.
System.Management.Automation.RemoteException
#### `submit<K>(type, data)`
System.Management.Automation.RemoteException
```typescript
submit<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): boolean
```
System.Management.Automation.RemoteException
Submits a command. All registered validators for this command type are run immediately (synchronously). If any validator rejects, the command is not queued.
System.Management.Automation.RemoteException
**Returns:** `true` if the command passed all validators and was queued, `false` if rejected. This is the compatibility wrapper over `submitWithResult()`; the two paths produce identical observable outcomes (same validator pipeline, same `submissionSequence` assignment, same listener emissions). Use `submitWithResult()` when the caller wants the full structured `CommandSubmissionResult`.
System.Management.Automation.RemoteException
```typescript
const accepted = world.submit('moveUnit', { entityId: 0, targetX: 5, targetY: 3 });
// accepted: true if validation passed
```
System.Management.Automation.RemoteException
#### `submitWithResult<K>(type, data)`
System.Management.Automation.RemoteException
```typescript
submitWithResult<K extends keyof TCommandMap>(
  type: K,
  data: TCommandMap[K],
): CommandSubmissionResult<K>
```
System.Management.Automation.RemoteException
Submits a command and returns the full structured outcome.
System.Management.Automation.RemoteException
```typescript
const result = world.submitWithResult('moveUnit', {
  entityId: 0,
  targetX: 5,
  targetY: 3,
});
```
System.Management.Automation.RemoteException
#### `registerValidator<K>(type, fn)`
System.Management.Automation.RemoteException
```typescript
registerValidator<K extends keyof TCommandMap>(
  type: K,
  fn: (
    data: TCommandMap[K],
    world: World<TEventMap, TCommandMap, TComponents, TState>,
  ) => CommandValidationResult,
): void
```
System.Management.Automation.RemoteException
Adds a validator for a command type. Multiple validators can be registered per type ╞Æ?" they short-circuit on the first `false` return.
System.Management.Automation.RemoteException
```typescript
world.registerValidator('moveUnit', (data, w) => {
  return w.isAlive(data.entityId);
});
```
System.Management.Automation.RemoteException
Validators may also return a structured rejection object:
System.Management.Automation.RemoteException
```typescript
world.registerValidator('moveUnit', (data, w) => {
  if (!w.isAlive(data.entityId)) {
    return {
      code: 'dead_entity',
      message: 'Entity is not alive',
      details: { entityId: data.entityId },
    };
  }
  return true;
});
```
System.Management.Automation.RemoteException
#### `registerHandler<K>(type, fn)`
System.Management.Automation.RemoteException
```typescript
registerHandler<K extends keyof TCommandMap>(
  type: K,
  fn: (
    data: TCommandMap[K],
    world: World<TEventMap, TCommandMap, TComponents, TState>,
  ) => void,
): void
```
System.Management.Automation.RemoteException
Sets the handler for a command type. Exactly one handler per type. The handler runs at tick start when commands are processed.
System.Management.Automation.RemoteException
**Throws:** `Error` if a handler is already registered for this command type.
System.Management.Automation.RemoteException
When a command is processed but no handler is registered, the tick fails with a structured `TickFailure`. `world.step()` surfaces that failure as `WorldTickFailureError`. `ClientAdapter` checks this ahead of time and rejects unhandled client commands before they enter the queue.
System.Management.Automation.RemoteException
```typescript
world.registerHandler('moveUnit', (data, w) => {
  w.setPosition(data.entityId, { x: data.targetX, y: data.targetY });
});
```
System.Management.Automation.RemoteException
#### `hasCommandHandler(type)`
System.Management.Automation.RemoteException
```typescript
hasCommandHandler(type: keyof TCommandMap): boolean
```
System.Management.Automation.RemoteException
Returns whether a handler is registered for the command type. This is primarily useful for transport adapters that need to reject unhandled commands before enqueueing them.
System.Management.Automation.RemoteException
#### `onCommandResult(listener)`
System.Management.Automation.RemoteException
```typescript
onCommandResult(
  listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
): void
```
System.Management.Automation.RemoteException
Subscribes to accepted and rejected command submission results.
System.Management.Automation.RemoteException
#### `offCommandResult(listener)`
System.Management.Automation.RemoteException
```typescript
offCommandResult(
  listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
): void
```
System.Management.Automation.RemoteException
Removes a command-result listener.
System.Management.Automation.RemoteException
#### `onCommandExecution(listener)`
System.Management.Automation.RemoteException
```typescript
onCommandExecution(
  listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
): void
```
System.Management.Automation.RemoteException
Subscribes to tick-time command execution results.
System.Management.Automation.RemoteException
#### `offCommandExecution(listener)`
System.Management.Automation.RemoteException
```typescript
offCommandExecution(
  listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
): void
```
System.Management.Automation.RemoteException
Removes a command-execution listener.
System.Management.Automation.RemoteException
#### `onTickFailure(listener)`
System.Management.Automation.RemoteException
```typescript
onTickFailure(listener: (failure: TickFailure) => void): void
```
System.Management.Automation.RemoteException
Subscribes to structured tick failures.
System.Management.Automation.RemoteException
#### `offTickFailure(listener)`
System.Management.Automation.RemoteException
```typescript
offTickFailure(listener: (failure: TickFailure) => void): void
```
System.Management.Automation.RemoteException
Removes a tick-failure listener.
System.Management.Automation.RemoteException
### Events
System.Management.Automation.RemoteException
Events are a typed pub/sub mechanism for system-to-system communication and external observation. Events are buffered per tick and cleared at the start of the next tick.
System.Management.Automation.RemoteException
#### `emit<K>(type, data)`
System.Management.Automation.RemoteException
```typescript
emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void
```
System.Management.Automation.RemoteException
Emits an event. The event is added to the tick buffer and all registered listeners are called immediately (synchronously).
System.Management.Automation.RemoteException
```typescript
world.emit('unitDied', { entityId: 5, cause: 'starvation' });
```
System.Management.Automation.RemoteException
#### `on<K>(type, listener)`
System.Management.Automation.RemoteException
```typescript
on<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): void
```
System.Management.Automation.RemoteException
Subscribes to an event type. The listener fires each time an event of this type is emitted.
System.Management.Automation.RemoteException
```typescript
world.on('unitDied', (event) => {
  console.log(`Unit ${event.entityId} died from ${event.cause}`);
});
```
System.Management.Automation.RemoteException
#### `off<K>(type, listener)`
System.Management.Automation.RemoteException
```typescript
off<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): void
```
System.Management.Automation.RemoteException
Unsubscribes from an event type. Pass the exact same function reference used in `on()`.
System.Management.Automation.RemoteException
#### `getEvents()`
System.Management.Automation.RemoteException
```typescript
getEvents(): ReadonlyArray<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>
```
System.Management.Automation.RemoteException
Returns all events emitted during the current tick. The returned array is read-only. Cleared at the start of each tick.
System.Management.Automation.RemoteException
```typescript
world.step();
for (const event of world.getEvents()) {
  console.log(event.type, event.data);
}
```
System.Management.Automation.RemoteException
### Randomness
System.Management.Automation.RemoteException
#### `random()`
System.Management.Automation.RemoteException
```typescript
random(): number
```
System.Management.Automation.RemoteException
Returns a deterministic pseudo-random number in `[0, 1)`. Worlds created with the same `seed` produce the same sequence, and snapshot version 3 stores the RNG state so `World.deserialize()` resumes from the exact next value.
System.Management.Automation.RemoteException
```typescript
const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10, seed: 'map-42' });
const roll = world.random();
```
System.Management.Automation.RemoteException
### Resources
System.Management.Automation.RemoteException
Resources are numeric pools (current/max) attached to entities with automatic production, consumption, and inter-entity transfers. Resource rates and transfers are processed after systems each tick.
System.Management.Automation.RemoteException
#### `registerResource(key, options?)`
System.Management.Automation.RemoteException
```typescript
registerResource(key: string, options?: { defaultMax?: number | null }): void
```
System.Management.Automation.RemoteException
Registers a resource type. Must be called before using any resource methods with this key.
System.Management.Automation.RemoteException
**Throws:** `Error` if the resource key is already registered.
System.Management.Automation.RemoteException
| Option | Type | Default | Description |
|---|---|---|---|
| `defaultMax` | `number \| null` | `null` | Default maximum capacity for new pools; `null` means unbounded |
System.Management.Automation.RemoteException
```typescript
world.registerResource('food');
world.registerResource('gold', { defaultMax: 1000 });
```
System.Management.Automation.RemoteException
#### `addResource(entity, key, amount)`
System.Management.Automation.RemoteException
```typescript
addResource(entity: EntityId, key: string, amount: number): number
```
System.Management.Automation.RemoteException
Adds to an entity's resource pool. Creates the pool if it doesn't exist (with the resource type's `defaultMax`). Clamped to the pool's maximum.
System.Management.Automation.RemoteException
**Returns:** The amount actually added (may be less than requested if the pool is near max).
System.Management.Automation.RemoteException
**Throws:** `Error` if the resource key is not registered, the entity is not alive, or `amount` is negative/non-finite.
System.Management.Automation.RemoteException
```typescript
const added = world.addResource(city, 'food', 50); // returns 50 (or less if near cap)
```
System.Management.Automation.RemoteException
#### `removeResource(entity, key, amount)`
System.Management.Automation.RemoteException
```typescript
removeResource(entity: EntityId, key: string, amount: number): number
```
System.Management.Automation.RemoteException
Removes from an entity's resource pool. Clamped to the current value (cannot go below 0).
System.Management.Automation.RemoteException
**Returns:** The amount actually removed.
System.Management.Automation.RemoteException
```typescript
const removed = world.removeResource(city, 'food', 30);
```
System.Management.Automation.RemoteException
#### `getResource(entity, key)`
System.Management.Automation.RemoteException
```typescript
getResource(entity: EntityId, key: string): { current: number; max: number | null } | undefined
```
System.Management.Automation.RemoteException
Returns a copy of the resource pool for the given entity, or `undefined` if the entity has no pool for this resource.
System.Management.Automation.RemoteException
```typescript
const pool = world.getResource(city, 'food');
if (pool) {
  console.log(`${pool.current}/${pool.max}`);
}
```
System.Management.Automation.RemoteException
#### `setResourceMax(entity, key, max)`
System.Management.Automation.RemoteException
```typescript
setResourceMax(entity: EntityId, key: string, max: number | null): void
```
System.Management.Automation.RemoteException
Sets the maximum capacity for a resource pool. If `current` exceeds the new max, it is clamped down. Use `null` for unbounded capacity. No-op if the entity has no pool for this resource.
System.Management.Automation.RemoteException
```typescript
world.setResourceMax(city, 'food', 200);
```
System.Management.Automation.RemoteException
#### `setProduction(entity, key, rate)`
System.Management.Automation.RemoteException
```typescript
setProduction(entity: EntityId, key: string, rate: number): void
```
System.Management.Automation.RemoteException
Sets the per-tick production rate. A pool is auto-created if one doesn't exist. Set to `0` to remove the production rate.
System.Management.Automation.RemoteException
```typescript
world.setProduction(farm, 'food', 5); // +5 food/tick
world.setProduction(farm, 'food', 0); // stop producing
```
System.Management.Automation.RemoteException
#### `setConsumption(entity, key, rate)`
System.Management.Automation.RemoteException
```typescript
setConsumption(entity: EntityId, key: string, rate: number): void
```
System.Management.Automation.RemoteException
Sets the per-tick consumption rate. Does not auto-create a pool. Set to `0` to remove the consumption rate.
System.Management.Automation.RemoteException
```typescript
world.setConsumption(city, 'food', 2); // -2 food/tick
```
System.Management.Automation.RemoteException
#### `getProduction(entity, key)`
System.Management.Automation.RemoteException
```typescript
getProduction(entity: EntityId, key: string): number
```
System.Management.Automation.RemoteException
Returns the production rate for an entity/resource, or `0` if none set.
System.Management.Automation.RemoteException
#### `getConsumption(entity, key)`
System.Management.Automation.RemoteException
```typescript
getConsumption(entity: EntityId, key: string): number
```
System.Management.Automation.RemoteException
Returns the consumption rate for an entity/resource, or `0` if none set.
System.Management.Automation.RemoteException
#### `addTransfer(from, to, resource, rate)`
System.Management.Automation.RemoteException
```typescript
addTransfer(from: EntityId, to: EntityId, resource: string, rate: number): number
```
System.Management.Automation.RemoteException
Creates a recurring resource transfer. Each tick, up to `rate` units are moved from the source entity's pool to the destination entity's pool (clamped by source availability and destination capacity).
System.Management.Automation.RemoteException
Transfers involving dead entities are automatically removed during tick processing.
System.Management.Automation.RemoteException
**Returns:** A unique transfer ID (for later removal with `removeTransfer`).
System.Management.Automation.RemoteException
```typescript
const transferId = world.addTransfer(farm, city, 'food', 3); // 3 food/tick
```
System.Management.Automation.RemoteException
#### `removeTransfer(id)`
System.Management.Automation.RemoteException
```typescript
removeTransfer(id: number): void
```
System.Management.Automation.RemoteException
Removes a transfer by its ID.
System.Management.Automation.RemoteException
```typescript
world.removeTransfer(transferId);
```
System.Management.Automation.RemoteException
#### `getTransfers(entity)`
System.Management.Automation.RemoteException
```typescript
getTransfers(entity: EntityId): Array<{
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}>
```
System.Management.Automation.RemoteException
Returns all transfers that involve the given entity (as source or destination).
System.Management.Automation.RemoteException
#### `getResourceEntities(key)`
System.Management.Automation.RemoteException
```typescript
*getResourceEntities(key: string): IterableIterator<EntityId>
```
System.Management.Automation.RemoteException
Iterates all entities that have a pool for this resource.
System.Management.Automation.RemoteException
```typescript
for (const id of world.getResourceEntities('food')) {
  const pool = world.getResource(id, 'food')!;
  console.log(`Entity ${id}: ${pool.current} food`);
}
```
System.Management.Automation.RemoteException
### World State
System.Management.Automation.RemoteException
Non-entity structured state stored at the world level. Values must be JSON-compatible. World state is included in serialization (snapshot v5) and tick diffs.
System.Management.Automation.RemoteException
#### `setState(key, value)`
System.Management.Automation.RemoteException
```typescript
setState(key: string, value: unknown): void
```
System.Management.Automation.RemoteException
Stores a world-level state value under the given key. Overwrites any existing value for that key. The value must be JSON-compatible.
System.Management.Automation.RemoteException
```typescript
world.setState('turnNumber', 1);
world.setState('diplomacy', { alliances: [], wars: [] });
```
System.Management.Automation.RemoteException
#### `getState(key)`
System.Management.Automation.RemoteException
```typescript
getState(key: string): unknown
```
System.Management.Automation.RemoteException
Retrieves a world-level state value by key, or `undefined` if the key does not exist.
System.Management.Automation.RemoteException
```typescript
const turn = world.getState('turnNumber'); // 1
```
System.Management.Automation.RemoteException
#### `deleteState(key)`
System.Management.Automation.RemoteException
```typescript
deleteState(key: string): void
```
System.Management.Automation.RemoteException
Removes a world-level state entry. No-op if the key does not exist.
System.Management.Automation.RemoteException
```typescript
world.deleteState('diplomacy');
```
System.Management.Automation.RemoteException
#### `hasState(key)`
System.Management.Automation.RemoteException
```typescript
hasState(key: string): boolean
```
System.Management.Automation.RemoteException
Returns `true` if the world has a state entry for the given key.
System.Management.Automation.RemoteException
```typescript
if (world.hasState('turnNumber')) {
  // ...
}
```
System.Management.Automation.RemoteException
### Tags & Metadata
System.Management.Automation.RemoteException
String tags and key-value metadata attached to individual entities. Both are cleaned up automatically on `destroyEntity()` and included in serialization (snapshot v5) and tick diffs.
System.Management.Automation.RemoteException
#### `addTag(entity, tag)`
System.Management.Automation.RemoteException
```typescript
addTag(entity: EntityId, tag: string): void
```
System.Management.Automation.RemoteException
Adds a string label to an entity. No-op if the entity already has the tag.
System.Management.Automation.RemoteException
```typescript
world.addTag(unit, 'selected');
world.addTag(unit, 'military');
```
System.Management.Automation.RemoteException
#### `removeTag(entity, tag)`
System.Management.Automation.RemoteException
```typescript
removeTag(entity: EntityId, tag: string): void
```
System.Management.Automation.RemoteException
Removes a tag from an entity. No-op if the entity does not have the tag.
System.Management.Automation.RemoteException
```typescript
world.removeTag(unit, 'selected');
```
System.Management.Automation.RemoteException
#### `hasTag(entity, tag)`
System.Management.Automation.RemoteException
```typescript
hasTag(entity: EntityId, tag: string): boolean
```
System.Management.Automation.RemoteException
Returns `true` if the entity has the given tag.
System.Management.Automation.RemoteException
```typescript
if (world.hasTag(unit, 'military')) {
  // ...
}
```
System.Management.Automation.RemoteException
#### `getByTag(tag)`
System.Management.Automation.RemoteException
```typescript
getByTag(tag: string): ReadonlySet<EntityId>
```
System.Management.Automation.RemoteException
Returns all entities that have the given tag. The returned set is read-only.
System.Management.Automation.RemoteException
```typescript
for (const id of world.getByTag('military')) {
  // process each military entity
}
```
System.Management.Automation.RemoteException
#### `getTags(entity)`
System.Management.Automation.RemoteException
```typescript
getTags(entity: EntityId): ReadonlySet<string>
```
System.Management.Automation.RemoteException
Returns all tags for an entity. The returned set is read-only.
System.Management.Automation.RemoteException
```typescript
const tags = world.getTags(unit); // ReadonlySet<string>
```
System.Management.Automation.RemoteException
#### `setMeta(entity, key, value)`
System.Management.Automation.RemoteException
```typescript
setMeta(entity: EntityId, key: string, value: string | number): void
```
System.Management.Automation.RemoteException
Sets a metadata key-value pair on an entity. Metadata values are restricted to `string` or `number`.
System.Management.Automation.RemoteException
```typescript
world.setMeta(unit, 'owner', 'player1');
world.setMeta(unit, 'level', 3);
```
System.Management.Automation.RemoteException
#### `getMeta(entity, key)`
System.Management.Automation.RemoteException
```typescript
getMeta(entity: EntityId, key: string): string | number | undefined
```
System.Management.Automation.RemoteException
Returns the metadata value for the given entity and key, or `undefined` if not set.
System.Management.Automation.RemoteException
```typescript
const owner = world.getMeta(unit, 'owner'); // 'player1'
```
System.Management.Automation.RemoteException
#### `deleteMeta(entity, key)`
System.Management.Automation.RemoteException
```typescript
deleteMeta(entity: EntityId, key: string): void
```
System.Management.Automation.RemoteException
Removes a metadata entry from an entity. No-op if the key does not exist.
System.Management.Automation.RemoteException
```typescript
world.deleteMeta(unit, 'owner');
```
System.Management.Automation.RemoteException
#### `getByMeta(key, value)`
System.Management.Automation.RemoteException
```typescript
getByMeta(key: string, value: string | number): EntityId | undefined
```
System.Management.Automation.RemoteException
Reverse lookup: finds the entity that has the given metadata key-value pair. Returns `undefined` if no entity matches.
System.Management.Automation.RemoteException
```typescript
const player1Unit = world.getByMeta('owner', 'player1');
```
System.Management.Automation.RemoteException
### Spatial Queries
System.Management.Automation.RemoteException
Higher-level spatial query helpers built on top of the spatial grid and component stores.
System.Management.Automation.RemoteException
#### `queryInRadius(cx, cy, radius, ...components)`
System.Management.Automation.RemoteException
```typescript
queryInRadius(
  cx: number,
  cy: number,
  radius: number,
  ...components: string[]
): EntityId[]
```
System.Management.Automation.RemoteException
Returns all entities within the given radius of `(cx, cy)` that match all specified components. Uses Euclidean distance.
System.Management.Automation.RemoteException
```typescript
const nearby = world.queryInRadius(10, 10, 5, 'position', 'health');
```
System.Management.Automation.RemoteException
#### `findNearest(cx, cy, ...components)`
System.Management.Automation.RemoteException
```typescript
findNearest(
  cx: number,
  cy: number,
  ...components: string[]
): EntityId | undefined
```
System.Management.Automation.RemoteException
Returns the closest entity to `(cx, cy)` that matches all specified components, or `undefined` if no entity matches. Uses Euclidean distance.
System.Management.Automation.RemoteException
```typescript
const closest = world.findNearest(10, 10, 'position', 'enemy');
```
System.Management.Automation.RemoteException
### State Serialization
System.Management.Automation.RemoteException
#### `serialize(options?)`
System.Management.Automation.RemoteException
```typescript
serialize(options?: { inspectPoisoned?: boolean }): WorldSnapshot
```
System.Management.Automation.RemoteException
Captures the entire world state as a JSON-serializable snapshot. Includes entity state, all component data, resource state, grid config, and tick count. Does **not** include systems, validators, handlers, or event listeners (they are functions). Component data and state values are `structuredClone`d on the way out so the returned snapshot stays isolated from the live world.
System.Management.Automation.RemoteException
When called on a poisoned world, `serialize()` emits a one-time `console.warn` per poison cycle. Pass `{ inspectPoisoned: true }` to suppress the warning ╞Æ?" intended for engine-internal debug/history tooling that exists specifically to inspect poisoned state. The warning resets on `world.recover()`.
System.Management.Automation.RemoteException
```typescript
const snapshot = world.serialize();
const json = JSON.stringify(snapshot);
```
System.Management.Automation.RemoteException
#### `World.deserialize(snapshot, systems?)`
System.Management.Automation.RemoteException
```typescript
static deserialize<TEventMap, TCommandMap, TComponents, TState>(
  snapshot: WorldSnapshot,
  systems?: Array<
    | System<TEventMap, TCommandMap, TComponents, TState>
    | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>
    | LooseSystem
    | LooseSystemRegistration
  >,
): World<TEventMap, TCommandMap, TComponents, TState>
```
System.Management.Automation.RemoteException
Restores a world from a snapshot. Optionally accepts systems to re-register. After deserializing, you must also re-register:
- Command validators and handlers
- Event listeners
- Destroy callbacks
System.Management.Automation.RemoteException
Component data and state values are `structuredClone`d on read so the input snapshot stays isolated from the live world.
System.Management.Automation.RemoteException
**Throws:**
- `Error` if `snapshot.version` is not `1`, `2`, `3`, `4`, or `5`
- `Error` if entity state arrays have mismatched lengths
- `Error` if `snapshot.tags` or `snapshot.metadata` references a dead entity id
System.Management.Automation.RemoteException
Version 1 snapshots load with an empty resource store. Version 2 snapshots restore resource registrations, pools, rates, transfers, and the next transfer ID. Version 3 snapshots also restore deterministic RNG state. Version 4 snapshots also restore world-level state, entity tags, and entity metadata. Version 5 snapshots additionally round-trip per-component `ComponentStoreOptions` (`diffMode`) plus `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` when non-default.
System.Management.Automation.RemoteException
```typescript
const restored = World.deserialize(snapshot, [movementSystem, combatSystem]);
restored.registerValidator('moveUnit', validator);
restored.registerHandler('moveUnit', handler);
```
System.Management.Automation.RemoteException
### State Diffs
System.Management.Automation.RemoteException
#### `getDiff()`
System.Management.Automation.RemoteException
```typescript
getDiff(): TickDiff | null
```
System.Management.Automation.RemoteException
Returns the diff from the most recent tick, or `null` if no tick has been executed yet. The diff is rebuilt each tick.
System.Management.Automation.RemoteException
```typescript
world.step();
const diff = world.getDiff();
if (diff) {
  console.log(`Created: ${diff.entities.created}`);
  console.log(`Destroyed: ${diff.entities.destroyed}`);
}
```
System.Management.Automation.RemoteException
#### `getMetrics()`
System.Management.Automation.RemoteException
```typescript
getMetrics(): WorldMetrics | null
```
System.Management.Automation.RemoteException
Returns timing and count instrumentation from the most recent tick, or `null` before the first tick. Metrics include simulation budget data, last-tick command counts, entity/component counts, query cache hit/miss counts, the per-tick `spatial.explicitSyncs` count (incremented by every `setPosition`-style write), system timings, and tick section timings.
System.Management.Automation.RemoteException
In `instrumentationProfile: 'minimal'`, implicit `step()` still updates counts and total duration, but leaves detailed phase timings and per-system timing entries empty. In `instrumentationProfile: 'release'`, implicit `step()` leaves this as `null` so the shipping runtime does not pay for per-tick metrics. Explicit `stepWithResult()` calls still populate the full metrics payload for callers that deliberately opt into richer diagnostics.
System.Management.Automation.RemoteException
```typescript
world.step();
const metrics = world.getMetrics();
console.log(metrics?.query.cacheHits, metrics?.durationMs.total);
```
System.Management.Automation.RemoteException
#### `getInstrumentationProfile()`
System.Management.Automation.RemoteException
```typescript
getInstrumentationProfile(): InstrumentationProfile
```
System.Management.Automation.RemoteException
Returns the active instrumentation profile for this `World`.
System.Management.Automation.RemoteException
#### `getLastTickFailure()`
System.Management.Automation.RemoteException
```typescript
getLastTickFailure(): TickFailure | null
```
System.Management.Automation.RemoteException
Returns the most recent structured tick failure, or `null` if no tick has failed yet.
System.Management.Automation.RemoteException
#### `onDiff(fn)`
System.Management.Automation.RemoteException
```typescript
onDiff(fn: (diff: TickDiff) => void): void
```
System.Management.Automation.RemoteException
Subscribes to per-tick diffs. The callback fires at the end of each tick, after systems and resource processing.
System.Management.Automation.RemoteException
```typescript
world.onDiff((diff) => {
  // send to client, log, etc.
});
```
System.Management.Automation.RemoteException
#### `offDiff(fn)`
System.Management.Automation.RemoteException
```typescript
offDiff(fn: (diff: TickDiff) => void): void
```
System.Management.Automation.RemoteException
Unsubscribes from diffs. Pass the exact same function reference used in `onDiff()`.
System.Management.Automation.RemoteException
### Entity Lifecycle Hooks
System.Management.Automation.RemoteException
#### `onDestroy(callback)`
System.Management.Automation.RemoteException
```typescript
onDestroy(
  callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
): void
```
System.Management.Automation.RemoteException
Registers a callback that fires when any entity is destroyed, **before** its components are removed. This allows cleanup logic (e.g., removing references from other entities).
System.Management.Automation.RemoteException
Multiple callbacks can be registered. They fire in registration order.
System.Management.Automation.RemoteException
```typescript
world.onDestroy((id, w) => {
  // Entity still has its components here
  const owner = w.getComponent<{ ownerId: EntityId }>(id, 'owned');
  if (owner) {
    // clean up reference on the owner entity
  }
});
```
System.Management.Automation.RemoteException
#### `offDestroy(callback)`
System.Management.Automation.RemoteException
```typescript
offDestroy(
  callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
): void
```
System.Management.Automation.RemoteException
Unregisters a destroy callback. Pass the exact same function reference used in `onDestroy()`.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## SpatialGrid
System.Management.Automation.RemoteException
A sparse occupied-cell grid that tracks which entities are at each cell. The World automatically syncs entity positions to the grid. You should **read** from the grid but not write to it directly.
System.Management.Automation.RemoteException
```typescript
import { SpatialGrid, ORTHOGONAL, DIAGONAL, ALL_DIRECTIONS } from 'civ-engine';
```
System.Management.Automation.RemoteException
### Properties
System.Management.Automation.RemoteException
| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `getAt(x, y)`
System.Management.Automation.RemoteException
```typescript
getAt(x: number, y: number): ReadonlySet<EntityId> | null
```
System.Management.Automation.RemoteException
Returns the set of entities at a cell, or `null` if no entity is there. The returned set is read-only.
System.Management.Automation.RemoteException
**Throws:** `RangeError` if `(x, y)` is out of bounds.
System.Management.Automation.RemoteException
```typescript
const entities = world.grid.getAt(5, 3);
if (entities) {
  for (const id of entities) {
    console.log(`Entity ${id} is at (5, 3)`);
  }
}
```
System.Management.Automation.RemoteException
#### `getNeighbors(x, y, offsets?)`
System.Management.Automation.RemoteException
```typescript
getNeighbors(x: number, y: number, offsets?: ReadonlyArray<[number, number]>): EntityId[]
```
System.Management.Automation.RemoteException
Returns all entities in neighboring cells. Automatically skips out-of-bounds cells.
System.Management.Automation.RemoteException
**Throws:** `RangeError` if `(x, y)` is out of bounds.
System.Management.Automation.RemoteException
| Parameter | Default | Description |
|---|---|---|
| `offsets` | `ORTHOGONAL` | Direction offsets to check |
System.Management.Automation.RemoteException
```typescript
// 4 orthogonal neighbors (default)
const nearby = world.grid.getNeighbors(5, 3);
System.Management.Automation.RemoteException
// 8 directions (orthogonal + diagonal)
const allNearby = world.grid.getNeighbors(5, 3, ALL_DIRECTIONS);
System.Management.Automation.RemoteException
// Only diagonal
const diag = world.grid.getNeighbors(5, 3, DIAGONAL);
```
System.Management.Automation.RemoteException
### Direction Constants
System.Management.Automation.RemoteException
| Constant | Directions | Count |
|---|---|---|
| `ORTHOGONAL` | Up, Down, Left, Right | 4 |
| `DIAGONAL` | Up-Left, Up-Right, Down-Left, Down-Right | 4 |
| `ALL_DIRECTIONS` | All 8 | 8 |
System.Management.Automation.RemoteException
Each constant is `ReadonlyArray<[number, number]>` of `[dx, dy]` offsets.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Pathfinding
System.Management.Automation.RemoteException
Generic A* pathfinding on any graph topology. Standalone utility with no dependency on World or SpatialGrid.
System.Management.Automation.RemoteException
```typescript
import { findPath, type PathConfig, type PathResult } from 'civ-engine';
```
System.Management.Automation.RemoteException
### `findPath<T>(config)`
System.Management.Automation.RemoteException
```typescript
findPath<T>(config: PathConfig<T>): PathResult<T> | null
```
System.Management.Automation.RemoteException
Finds the shortest path from `start` to `goal` using A*.
System.Management.Automation.RemoteException
**Returns:** `PathResult<T>` with the path and cost, or `null` if no path exists, the cost ceiling is exceeded, or the iteration limit is reached.
System.Management.Automation.RemoteException
**Behavior details:**
- If `start === goal` (by hash), returns immediately with `{ path: [start], cost: 0 }`
- Edges with `Infinity` cost are treated as impassable and skipped
- Uses an internal min-heap for the open set
- `maxCost` terminates early if the best known cost exceeds it
- `maxIterations` prevents infinite loops on large graphs (default: 10,000)
System.Management.Automation.RemoteException
**Grid pathfinding example:**
System.Management.Automation.RemoteException
```typescript
const WIDTH = 32;
const HEIGHT = 32;
System.Management.Automation.RemoteException
const result = findPath<number>({
  start: 0,         // top-left corner
  goal: WIDTH * HEIGHT - 1,  // bottom-right corner
  neighbors: (node) => {
    const x = node % WIDTH;
    const y = Math.floor(node / WIDTH);
    const result: number[] = [];
    if (x > 0) result.push(node - 1);
    if (x < WIDTH - 1) result.push(node + 1);
    if (y > 0) result.push(node - WIDTH);
    if (y < HEIGHT - 1) result.push(node + WIDTH);
    return result;
  },
  cost: () => 1,
  heuristic: (node, goal) => {
    return Math.abs((node % WIDTH) - (goal % WIDTH))
         + Math.abs(Math.floor(node / WIDTH) - Math.floor(goal / WIDTH));
  },
  hash: (node) => node,
  maxCost: 100,
  trackExplored: true,
});
System.Management.Automation.RemoteException
if (result) {
  console.log(`Path: ${result.path.length} steps, cost: ${result.cost}`);
  console.log(`Explored: ${result.explored} nodes`);
}
```
System.Management.Automation.RemoteException
**Graph pathfinding example (non-grid):**
System.Management.Automation.RemoteException
```typescript
interface City { name: string; x: number; y: number }
System.Management.Automation.RemoteException
const cities: Record<string, City> = {
  A: { name: 'A', x: 0, y: 0 },
  B: { name: 'B', x: 3, y: 4 },
  C: { name: 'C', x: 10, y: 0 },
};
System.Management.Automation.RemoteException
const roads: Record<string, string[]> = {
  A: ['B', 'C'],
  B: ['A', 'C'],
  C: ['A', 'B'],
};
System.Management.Automation.RemoteException
const result = findPath<string>({
  start: 'A',
  goal: 'C',
  neighbors: (city) => roads[city] ?? [],
  cost: (from, to) => {
    const a = cities[from];
    const b = cities[to];
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  },
  heuristic: (city, goal) => {
    const a = cities[city];
    const b = cities[goal];
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  },
  hash: (city) => city,
});
```
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## OccupancyGrid
System.Management.Automation.RemoteException
Deterministic blocked-cell, footprint, occupancy, and reservation tracking. Standalone utility that answers "can something stand here?" rather than "who is nearby?".
System.Management.Automation.RemoteException
```typescript
import {
  OccupancyGrid,
  type OccupancyArea,
  type OccupancyGridMetrics,
  type OccupancyGridState,
  type OccupancyQueryOptions,
  type OccupancyRect,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new OccupancyGrid(width: number, height: number)
```
System.Management.Automation.RemoteException
Creates an empty occupancy model for a fixed grid size.
System.Management.Automation.RemoteException
| Parameter | Description |
|---|---|
| `width` | Positive integer grid width |
| `height` | Positive integer grid height |
System.Management.Automation.RemoteException
### Properties
System.Management.Automation.RemoteException
| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
| `version` | `number` | Monotonic passability version incremented on mutations |
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `setBlocked(area, blocked)`
System.Management.Automation.RemoteException
```typescript
setBlocked(area: OccupancyArea, blocked: boolean): void
```
System.Management.Automation.RemoteException
Sets blocked status for a footprint or list of cells. Throws if a blocked write would overlap an occupied or reserved cell.
System.Management.Automation.RemoteException
#### `block(area)`
System.Management.Automation.RemoteException
```typescript
block(area: OccupancyArea): void
```
System.Management.Automation.RemoteException
Marks cells as blocked.
System.Management.Automation.RemoteException
#### `unblock(area)`
System.Management.Automation.RemoteException
```typescript
unblock(area: OccupancyArea): void
```
System.Management.Automation.RemoteException
Clears blocked cells.
System.Management.Automation.RemoteException
#### `isBlocked(x, y, options?)`
System.Management.Automation.RemoteException
```typescript
isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean
```
System.Management.Automation.RemoteException
Returns `true` if the cell is blocked, occupied by another entity, or reserved by another entity.
System.Management.Automation.RemoteException
#### `canOccupy(entity, area, options?)`
System.Management.Automation.RemoteException
```typescript
canOccupy(
  entity: EntityId,
  area: OccupancyArea,
  options?: { includeReservations?: boolean },
): boolean
```
System.Management.Automation.RemoteException
Checks whether an entity may claim a footprint as occupied.
System.Management.Automation.RemoteException
#### `occupy(entity, area)`
System.Management.Automation.RemoteException
```typescript
occupy(entity: EntityId, area: OccupancyArea): boolean
```
System.Management.Automation.RemoteException
Claims a footprint for an entity. Returns `false` on conflict instead of throwing.
System.Management.Automation.RemoteException
#### `canReserve(entity, area)`
System.Management.Automation.RemoteException
```typescript
canReserve(entity: EntityId, area: OccupancyArea): boolean
```
System.Management.Automation.RemoteException
Checks whether an entity may reserve a footprint.
System.Management.Automation.RemoteException
#### `reserve(entity, area)`
System.Management.Automation.RemoteException
```typescript
reserve(entity: EntityId, area: OccupancyArea): boolean
```
System.Management.Automation.RemoteException
Creates or replaces a reservation for an entity. Returns `false` on conflict.
System.Management.Automation.RemoteException
#### `clearReservation(entity)`
System.Management.Automation.RemoteException
```typescript
clearReservation(entity: EntityId): void
```
System.Management.Automation.RemoteException
Clears only the reservation owned by the entity.
System.Management.Automation.RemoteException
#### `release(entity)`
System.Management.Automation.RemoteException
```typescript
release(entity: EntityId): void
```
System.Management.Automation.RemoteException
Clears both occupancy and reservation state for an entity.
System.Management.Automation.RemoteException
#### `getOccupant(x, y)`
System.Management.Automation.RemoteException
```typescript
getOccupant(x: number, y: number): EntityId | null
```
System.Management.Automation.RemoteException
Returns the entity occupying a cell, or `null`.
System.Management.Automation.RemoteException
#### `getReservationOwner(x, y)`
System.Management.Automation.RemoteException
```typescript
getReservationOwner(x: number, y: number): EntityId | null
```
System.Management.Automation.RemoteException
Returns the entity reserving a cell, or `null`.
System.Management.Automation.RemoteException
#### `getOccupiedCells(entity)`
System.Management.Automation.RemoteException
```typescript
getOccupiedCells(entity: EntityId): Position[]
```
System.Management.Automation.RemoteException
Returns the claimed occupied cells for an entity as positions.
System.Management.Automation.RemoteException
#### `getReservedCells(entity)`
System.Management.Automation.RemoteException
```typescript
getReservedCells(entity: EntityId): Position[]
```
System.Management.Automation.RemoteException
Returns the claimed reserved cells for an entity as positions.
System.Management.Automation.RemoteException
#### `getMetrics()`
System.Management.Automation.RemoteException
```typescript
getMetrics(): OccupancyGridMetrics
```
System.Management.Automation.RemoteException
Returns runtime scan counters for blocking checks, footprint claims, and snapshot reads.
System.Management.Automation.RemoteException
#### `resetMetrics()`
System.Management.Automation.RemoteException
```typescript
resetMetrics(): void
```
System.Management.Automation.RemoteException
Clears all accumulated `OccupancyGrid` counters without affecting occupancy state or `version`.
System.Management.Automation.RemoteException
#### `getState()`
System.Management.Automation.RemoteException
```typescript
getState(): OccupancyGridState
```
System.Management.Automation.RemoteException
Returns a JSON-safe deterministic snapshot of the occupancy model.
System.Management.Automation.RemoteException
#### `OccupancyGrid.fromState(state)`
System.Management.Automation.RemoteException
```typescript
OccupancyGrid.fromState(state: OccupancyGridState): OccupancyGrid
```
System.Management.Automation.RemoteException
Restores an occupancy model from serialized state.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## OccupancyBinding
System.Management.Automation.RemoteException
Higher-level occupancy ownership built on top of `OccupancyGrid` and optional `SubcellOccupancyGrid`. Use it when game code wants blocker metadata, destroy-time cleanup hooks, a `GridPassability` surface for `findGridPath()`, and measurable occupancy counters in one object.
System.Management.Automation.RemoteException
```typescript
import {
  OccupancyBinding,
  type OccupancyBindingClaimOptions,
  type OccupancyBindingMetrics,
  type OccupancyBindingOptions,
  type OccupancyBindingSubcellOptions,
  type OccupancyCellStatus,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new OccupancyBinding(
  width: number,
  height: number,
  options?: OccupancyBindingOptions,
)
```
System.Management.Automation.RemoteException
Creates a higher-level occupancy surface for a fixed grid size.
System.Management.Automation.RemoteException
### Properties
System.Management.Automation.RemoteException
| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
| `version` | `number` | Monotonic passability version incremented on binding-level mutations |
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `attachWorld(world)`
System.Management.Automation.RemoteException
```typescript
attachWorld(world: OccupancyBindingWorldHooks): void
```
System.Management.Automation.RemoteException
Registers destroy-time cleanup so tracked claims are released automatically when entities die.
System.Management.Automation.RemoteException
#### `detachWorld()`
System.Management.Automation.RemoteException
```typescript
detachWorld(): void
```
System.Management.Automation.RemoteException
Removes the currently attached destroy hook source, if any.
System.Management.Automation.RemoteException
#### `block(area, options?)`
System.Management.Automation.RemoteException
```typescript
block(area: OccupancyArea, options?: OccupancyBindingClaimOptions): void
```
System.Management.Automation.RemoteException
Marks cells as blocked and records blocker metadata such as `terrain`. Throws if any targeted cell still contains crowded sub-cell occupants.
System.Management.Automation.RemoteException
#### `unblock(area)`
System.Management.Automation.RemoteException
```typescript
unblock(area: OccupancyArea): void
```
System.Management.Automation.RemoteException
Clears blocked cells and any stored static blocker metadata for them.
System.Management.Automation.RemoteException
#### `occupy(entity, area, options?)`
System.Management.Automation.RemoteException
```typescript
occupy(
  entity: EntityId,
  area: OccupancyArea,
  options?: OccupancyBindingClaimOptions,
): boolean
```
System.Management.Automation.RemoteException
Claims a whole-cell footprint and records metadata such as `building`, `resource`, or `unit`.
System.Management.Automation.RemoteException
#### `reserve(entity, area, options?)`
System.Management.Automation.RemoteException
```typescript
reserve(
  entity: EntityId,
  area: OccupancyArea,
  options?: OccupancyBindingClaimOptions,
): boolean
```
System.Management.Automation.RemoteException
Creates or replaces a reservation with optional blocker metadata. Returns `false` if the requested cells are blocked, claimed, or still occupied by crowded sub-cell units.
System.Management.Automation.RemoteException
#### `clearReservation(entity)`
System.Management.Automation.RemoteException
```typescript
clearReservation(entity: EntityId): void
```
System.Management.Automation.RemoteException
Clears only the reservation state for the entity.
System.Management.Automation.RemoteException
#### `isBlocked(x, y, options?)`
System.Management.Automation.RemoteException
```typescript
isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean
```
System.Management.Automation.RemoteException
Implements `GridPassability` across both owned whole-cell occupancy and sub-cell crowding. Fully crowded cells are treated as blocked for path queries.
System.Management.Automation.RemoteException
#### `canOccupySubcell(entity, position, options?)`
System.Management.Automation.RemoteException
```typescript
canOccupySubcell(
  entity: EntityId,
  position: Position,
  options?: OccupancyBindingSubcellOptions,
): boolean
```
System.Management.Automation.RemoteException
Checks whether the entity can claim at least one slot in the target cell.
System.Management.Automation.RemoteException
#### `bestSubcellPlacement(entity, position, options?)`
System.Management.Automation.RemoteException
```typescript
bestSubcellPlacement(
  entity: EntityId,
  position: Position,
  options?: OccupancyBindingSubcellOptions,
): SubcellPlacement | null
```
System.Management.Automation.RemoteException
Returns the best available sub-cell placement for the entity.
System.Management.Automation.RemoteException
#### `occupySubcell(entity, position, options?)`
System.Management.Automation.RemoteException
```typescript
occupySubcell(
  entity: EntityId,
  position: Position,
  options?: OccupancyBindingSubcellOptions,
): SubcellPlacement | null
```
System.Management.Automation.RemoteException
Claims the best available sub-cell slot and records metadata such as `unit`.
System.Management.Automation.RemoteException
#### `neighborsWithSpace(entity, origin, options?)`
System.Management.Automation.RemoteException
```typescript
neighborsWithSpace(
  entity: EntityId,
  origin: Position,
  options?: OccupancyBindingSubcellOptions,
): SubcellNeighborSpace[]
```
System.Management.Automation.RemoteException
Returns neighboring cells with room for the entity, along with free-slot counts and the best placement in each cell.
System.Management.Automation.RemoteException
#### `release(entity)`
System.Management.Automation.RemoteException
```typescript
release(entity: EntityId): void
```
System.Management.Automation.RemoteException
Clears all whole-cell, reservation, and sub-cell claims owned by the entity.
System.Management.Automation.RemoteException
#### `getCellStatus(x, y, options?)`
System.Management.Automation.RemoteException
```typescript
getCellStatus(
  x: number,
  y: number,
  options?: OccupancyQueryOptions,
): OccupancyCellStatus
```
System.Management.Automation.RemoteException
Returns combined `blockedBy` and `crowdedBy` metadata for the cell. `blocked` is `true` when either a whole-cell blocker exists or no sub-cell slots remain for the query.
System.Management.Automation.RemoteException
#### `getMetrics()`
System.Management.Automation.RemoteException
```typescript
getMetrics(): OccupancyBindingMetrics
```
System.Management.Automation.RemoteException
Returns aggregate binding, whole-cell, and crowding scan counters.
System.Management.Automation.RemoteException
#### `resetMetrics()`
System.Management.Automation.RemoteException
```typescript
resetMetrics(): void
```
System.Management.Automation.RemoteException
Clears all accumulated binding and owned-grid counters without affecting occupancy state or `version`.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## SubcellOccupancyGrid
System.Management.Automation.RemoteException
Deterministic slot-based crowding for units smaller than a full integer cell. Use it alongside `OccupancyGrid` when whole-cell blockers and smaller-than-cell unit packing need to stay separate.
System.Management.Automation.RemoteException
```typescript
import {
  SubcellOccupancyGrid,
  type SubcellNeighborOptions,
  type SubcellNeighborSpace,
  type SubcellOccupancyGridMetrics,
  type SubcellOccupancyGridOptions,
  type SubcellOccupancyGridState,
  type SubcellOccupancyOptions,
  type SubcellPlacement,
  type SubcellSlotOffset,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new SubcellOccupancyGrid(
  width: number,
  height: number,
  options?: SubcellOccupancyGridOptions,
)
```
System.Management.Automation.RemoteException
Creates a slot-based crowding model for a fixed grid size.
System.Management.Automation.RemoteException
| Parameter | Description |
|---|---|
| `width` | Positive integer grid width |
| `height` | Positive integer grid height |
| `options` | Optional custom slot layout and whole-cell blocker callback |
System.Management.Automation.RemoteException
### Properties
System.Management.Automation.RemoteException
| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
| `slots` | `ReadonlyArray<SubcellSlotOffset>` | Slot offsets used inside each cell |
| `version` | `number` | Monotonic crowding version incremented on mutations |
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `canOccupy(entity, position, options?)`
System.Management.Automation.RemoteException
```typescript
canOccupy(
  entity: EntityId,
  position: Position,
  options?: SubcellOccupancyOptions,
): boolean
```
System.Management.Automation.RemoteException
Checks whether the entity can claim at least one slot in the target cell.
System.Management.Automation.RemoteException
#### `bestSlotForUnit(entity, position, options?)`
System.Management.Automation.RemoteException
```typescript
bestSlotForUnit(
  entity: EntityId,
  position: Position,
  options?: SubcellOccupancyOptions,
): SubcellPlacement | null
```
System.Management.Automation.RemoteException
Returns the best available slot for the entity in that cell, or `null` if the cell is blocked or full.
System.Management.Automation.RemoteException
#### `occupy(entity, position, options?)`
System.Management.Automation.RemoteException
```typescript
occupy(
  entity: EntityId,
  position: Position,
  options?: SubcellOccupancyOptions,
): SubcellPlacement | null
```
System.Management.Automation.RemoteException
Claims the best available slot for an entity and returns the resolved placement. Returns `null` on conflict instead of throwing.
System.Management.Automation.RemoteException
#### `release(entity)`
System.Management.Automation.RemoteException
```typescript
release(entity: EntityId): void
```
System.Management.Automation.RemoteException
Clears the slot assignment for an entity.
System.Management.Automation.RemoteException
#### `getSlotOccupant(x, y, slot)`
System.Management.Automation.RemoteException
```typescript
getSlotOccupant(x: number, y: number, slot: number): EntityId | null
```
System.Management.Automation.RemoteException
Returns the entity occupying a specific slot in a cell, or `null`.
System.Management.Automation.RemoteException
#### `getOccupiedPlacement(entity)`
System.Management.Automation.RemoteException
```typescript
getOccupiedPlacement(entity: EntityId): SubcellPlacement | null
```
System.Management.Automation.RemoteException
Returns the current slot assignment for an entity, or `null`.
System.Management.Automation.RemoteException
#### `neighborsWithSpace(entity, origin, options?)`
System.Management.Automation.RemoteException
```typescript
neighborsWithSpace(
  entity: EntityId,
  origin: Position,
  options?: SubcellNeighborOptions,
): SubcellNeighborSpace[]
```
System.Management.Automation.RemoteException
Returns neighboring cells that still have room for the entity, along with free-slot counts and the best slot in each cell.
System.Management.Automation.RemoteException
#### `getState()`
System.Management.Automation.RemoteException
```typescript
getState(): SubcellOccupancyGridState
```
System.Management.Automation.RemoteException
Returns a JSON-safe deterministic snapshot of the crowding model.
System.Management.Automation.RemoteException
#### `getMetrics()`
System.Management.Automation.RemoteException
```typescript
getMetrics(): SubcellOccupancyGridMetrics
```
System.Management.Automation.RemoteException
Returns runtime slot-scan and crowding-query counters.
System.Management.Automation.RemoteException
#### `resetMetrics()`
System.Management.Automation.RemoteException
```typescript
resetMetrics(): void
```
System.Management.Automation.RemoteException
Clears all accumulated `SubcellOccupancyGrid` counters without affecting occupancy state or `version`.
System.Management.Automation.RemoteException
#### `SubcellOccupancyGrid.fromState(state, options?)`
System.Management.Automation.RemoteException
```typescript
SubcellOccupancyGrid.fromState(
  state: SubcellOccupancyGridState,
  options?: Omit<SubcellOccupancyGridOptions, 'slots'>,
): SubcellOccupancyGrid
```
System.Management.Automation.RemoteException
Restores a crowding model from serialized state. The slot layout comes from the snapshot; `options` can supply a fresh `isCellBlocked` callback.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Path Service
System.Management.Automation.RemoteException
Grid-first path utilities and deterministic request processing built on top of the generic `findPath()` implementation.
System.Management.Automation.RemoteException
```typescript
import {
  PathCache,
  PathRequestQueue,
  createGridPathCacheKey,
  createGridPathQueue,
  findGridPath,
  gridPathPassabilityVersion,
  type GridPathConfig,
  type GridPathRequest,
  type PathRequestQueueEntry,
  type PathRequestQueueOptions,
  type PathRequestQueueStats,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### `findGridPath(config)`
System.Management.Automation.RemoteException
```typescript
findGridPath(config: GridPathConfig): PathResult<Position> | null
```
System.Management.Automation.RemoteException
Finds a path on a 2D grid using integer `Position` coordinates.
System.Management.Automation.RemoteException
**Behavior details:**
- Requires either `width` and `height`, or an `occupancy` grid
- Treats blocked occupancy cells as impassable
- Uses orthogonal movement by default
- Uses diagonal movement with octile heuristic when `allowDiagonal` is `true`
- Prevents diagonal corner cutting by default
- Returns positions instead of flat cell indices
System.Management.Automation.RemoteException
```typescript
const result = findGridPath({
  occupancy,
  movingEntity: unitId,
  start: { x: 12, y: 8 },
  goal: { x: 40, y: 25 },
  allowDiagonal: false,
});
```
System.Management.Automation.RemoteException
### `PathCache<TResult>`
System.Management.Automation.RemoteException
Reusable cache keyed by request identity and passability version.
System.Management.Automation.RemoteException
#### Constructor
System.Management.Automation.RemoteException
```typescript
new PathCache<TResult>()
```
System.Management.Automation.RemoteException
#### Methods
System.Management.Automation.RemoteException
```typescript
get(key: string, version: number): TResult | undefined
set(key: string, version: number, result: TResult): void
clear(): void
delete(key: string): void
```
System.Management.Automation.RemoteException
#### Property
System.Management.Automation.RemoteException
```typescript
size: number
```
System.Management.Automation.RemoteException
### `PathRequestQueue<TRequest, TResult>`
System.Management.Automation.RemoteException
Deterministic FIFO queue for spreading expensive request resolution across ticks.
System.Management.Automation.RemoteException
#### Constructor
System.Management.Automation.RemoteException
```typescript
new PathRequestQueue<TRequest, TResult>(
  options: PathRequestQueueOptions<TRequest, TResult>,
)
```
System.Management.Automation.RemoteException
#### Methods
System.Management.Automation.RemoteException
##### `enqueue(request)`
System.Management.Automation.RemoteException
```typescript
enqueue(request: TRequest): number
```
System.Management.Automation.RemoteException
Adds a request and returns its queue ID.
System.Management.Automation.RemoteException
##### `process(maxRequests?)`
System.Management.Automation.RemoteException
```typescript
process(maxRequests?: number): Array<PathRequestQueueEntry<TRequest, TResult>>
```
System.Management.Automation.RemoteException
Processes up to `maxRequests` queued items in FIFO order. Defaults to `1`.
System.Management.Automation.RemoteException
##### `clearPending()`
System.Management.Automation.RemoteException
```typescript
clearPending(): void
```
System.Management.Automation.RemoteException
Drops requests that have not been processed yet.
System.Management.Automation.RemoteException
##### `clearCache()`
System.Management.Automation.RemoteException
```typescript
clearCache(): void
```
System.Management.Automation.RemoteException
Clears cached resolved results.
System.Management.Automation.RemoteException
##### `getStats()`
System.Management.Automation.RemoteException
```typescript
getStats(): PathRequestQueueStats
```
System.Management.Automation.RemoteException
Returns queue and cache counters.
System.Management.Automation.RemoteException
#### Property
System.Management.Automation.RemoteException
##### `pendingCount`
System.Management.Automation.RemoteException
```typescript
pendingCount: number
```
System.Management.Automation.RemoteException
Number of requests still waiting to be processed.
System.Management.Automation.RemoteException
### `createGridPathQueue(defaults?)`
System.Management.Automation.RemoteException
```typescript
createGridPathQueue(
  defaults?: Omit<Partial<GridPathRequest>, 'start' | 'goal'>,
): PathRequestQueue<GridPathRequest, PathResult<Position> | null>
```
System.Management.Automation.RemoteException
Creates a `PathRequestQueue` specialized for `findGridPath()`, with automatic cache-key generation and passability-version tracking.
System.Management.Automation.RemoteException
### `createGridPathCacheKey(request)`
System.Management.Automation.RemoteException
```typescript
createGridPathCacheKey(request: GridPathRequest): string | undefined
```
System.Management.Automation.RemoteException
Builds the default cache key used by `createGridPathQueue()`. The generated key includes `movingEntity` so ignore-self passability queries do not reuse another entity's cached route. Returns `undefined` when the request contains custom `blocked`, `cost`, or `heuristic` functions and no explicit `cacheKey` is supplied.
System.Management.Automation.RemoteException
### `gridPathPassabilityVersion(request)`
System.Management.Automation.RemoteException
```typescript
gridPathPassabilityVersion(request: GridPathRequest): number
```
System.Management.Automation.RemoteException
Returns the passability version used for cache invalidation. Defaults to `request.passabilityVersion`, then `request.occupancy?.version`, then `0`.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## VisibilityMap
System.Management.Automation.RemoteException
Per-player visible and explored cell tracking for fog-of-war style systems. Standalone utility with no renderer dependency.
System.Management.Automation.RemoteException
```typescript
import {
  VisibilityMap,
  type VisibilityMapState,
  type VisibilityPlayerId,
  type VisionSource,
  type VisionSourceId,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new VisibilityMap(width: number, height: number)
```
System.Management.Automation.RemoteException
Creates an empty visibility state for a fixed grid size.
System.Management.Automation.RemoteException
### Properties
System.Management.Automation.RemoteException
| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `setSource(playerId, sourceId, source)`
System.Management.Automation.RemoteException
```typescript
setSource(
  playerId: VisibilityPlayerId,
  sourceId: VisionSourceId,
  source: VisionSource,
): void
```
System.Management.Automation.RemoteException
Adds or updates a circular vision source for one player.
System.Management.Automation.RemoteException
#### `removeSource(playerId, sourceId)`
System.Management.Automation.RemoteException
```typescript
removeSource(playerId: VisibilityPlayerId, sourceId: VisionSourceId): void
```
System.Management.Automation.RemoteException
Removes one source from a player's visibility state.
System.Management.Automation.RemoteException
#### `clearPlayer(playerId)`
System.Management.Automation.RemoteException
```typescript
clearPlayer(playerId: VisibilityPlayerId): void
```
System.Management.Automation.RemoteException
Removes all visibility state for one player.
System.Management.Automation.RemoteException
#### `update()`
System.Management.Automation.RemoteException
```typescript
update(): void
```
System.Management.Automation.RemoteException
Recomputes visibility for players with dirty sources.
System.Management.Automation.RemoteException
#### `isVisible(playerId, x, y)`
System.Management.Automation.RemoteException
```typescript
isVisible(playerId: VisibilityPlayerId, x: number, y: number): boolean
```
System.Management.Automation.RemoteException
Returns `true` if a cell is currently visible to the player.
System.Management.Automation.RemoteException
#### `isExplored(playerId, x, y)`
System.Management.Automation.RemoteException
```typescript
isExplored(playerId: VisibilityPlayerId, x: number, y: number): boolean
```
System.Management.Automation.RemoteException
Returns `true` if a cell has ever been visible to the player.
System.Management.Automation.RemoteException
#### `getVisibleCells(playerId)`
System.Management.Automation.RemoteException
```typescript
getVisibleCells(playerId: VisibilityPlayerId): Position[]
```
System.Management.Automation.RemoteException
Returns current visible cells as positions.
System.Management.Automation.RemoteException
#### `getExploredCells(playerId)`
System.Management.Automation.RemoteException
```typescript
getExploredCells(playerId: VisibilityPlayerId): Position[]
```
System.Management.Automation.RemoteException
Returns explored cells as positions.
System.Management.Automation.RemoteException
#### `getSources(playerId)`
System.Management.Automation.RemoteException
```typescript
getSources(playerId: VisibilityPlayerId): Array<[VisionSourceId, VisionSource]>
```
System.Management.Automation.RemoteException
Returns the player's current sources in deterministic order.
System.Management.Automation.RemoteException
#### `getState()`
System.Management.Automation.RemoteException
```typescript
getState(): VisibilityMapState
```
System.Management.Automation.RemoteException
Returns a JSON-safe visibility snapshot.
System.Management.Automation.RemoteException
#### `VisibilityMap.fromState(state)`
System.Management.Automation.RemoteException
```typescript
VisibilityMap.fromState(state: VisibilityMapState): VisibilityMap
```
System.Management.Automation.RemoteException
Restores a visibility map from serialized state.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Command Transaction
System.Management.Automation.RemoteException
Atomic propose-validate-commit-or-abort builder over `World`. Buffers proposed mutations, events, and precondition predicates; on `commit()` either applies everything (preconditions passed) or applies nothing (any precondition failed). v1 surface: components, position, events, resources. Inspired by MicropolisCore's `ToolEffects` (`MicropolisEngine/src/tool.h:171`).
System.Management.Automation.RemoteException
```typescript
import { CommandTransaction, type TransactionResult } from 'civ-engine';
```
System.Management.Automation.RemoteException
### `world.transaction()`
System.Management.Automation.RemoteException
```typescript
transaction(): CommandTransaction<TEventMap, TCommandMap, TComponents, TState>
```
System.Management.Automation.RemoteException
Creates a fresh transaction bound to this world. The returned transaction inherits all four of the world's generics, so typed component / state / event access works inside the transaction the same way it works against `world.setComponent` / `world.emit` directly. `world.transaction().setComponent(e, 'hp', { wrong: 5 })` against `World<..., ..., { hp: { current: number } }, ...>` is a TypeScript error matching `world.setComponent`.
System.Management.Automation.RemoteException
### Builder methods (chainable, return `this`)
System.Management.Automation.RemoteException
| Method | Buffers |
|---|---|
| `setComponent(entity, key, data)` | A `setComponent` mutation |
| `addComponent(entity, key, data)` | Alias for `setComponent` (matches `World.addComponent`) |
| `patchComponent(entity, key, patch)` | A `patchComponent` mutation; `patch` runs at commit time against current state |
| `removeComponent(entity, key)` | A `removeComponent` mutation |
| `setPosition(entity, position, key?)` | A `setPosition` mutation; `key` defaults to the world's `positionKey` |
| `addResource(entity, resource, amount)` | An `addResource` mutation |
| `removeResource(entity, resource, amount)` | A `removeResource` mutation |
| `emit(type, data)` | A buffered event; emitted via `EventBus` only on successful commit |
| `require(predicate)` | A precondition; `predicate(world)` runs before any mutation applies |
System.Management.Automation.RemoteException
All builder methods throw if the transaction has already been committed or aborted.
System.Management.Automation.RemoteException
### Preconditions
System.Management.Automation.RemoteException
```typescript
type TransactionPrecondition<TEventMap, TCommandMap, TComponents, TState> =
  (world: ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>)
    => true | false | string;
```
System.Management.Automation.RemoteException
A predicate receives a **read-only faAade** of the world and must return one of:
System.Management.Automation.RemoteException
- `true` ╞Æ?" pass
- `false` ╞Æ?" fail (rejection reason: `"precondition returned false"`)
- a `string` ╞Æ?" fail (rejection reason: the string)
System.Management.Automation.RemoteException
`ReadOnlyTransactionWorld` is `Omit<World, K>` where `K` is the exhaustive `FORBIDDEN_PRECONDITION_METHODS` array. Every public mutation, lifecycle, listener-subscription, RNG, and sub-engine method on `World` is excluded ╞Æ?" including `random` (because it advances `DeterministicRandom.state`), `setProduction` / `setConsumption` / `setResourceMax`, `start` / `stop` / `pause` / `resume` / `setSpeed`, every `on*` / `off*` listener subscription, and `warnIfPoisoned` (consumes the warn-once latch). Predicates may freely call read methods (`getComponent`, `hasResource`, `getState`, `getInRadius`, `findNearest`, `getByTag`, etc.). Three structurally-different mechanisms enforce side-effect freedom:
System.Management.Automation.RemoteException
1. **Method-name denylist.** Calling a forbidden method fails to typecheck; if the type is cast away, the runtime proxy throws `CommandTransaction precondition cannot call '<method>': preconditions must be side-effect free`. A property-based meta-test cross-checks `FORBIDDEN_PRECONDITION_METHODS` against `Object.getOwnPropertyNames(World.prototype)` so future World additions can't slip past silently.
2. **Clone-on-read for live-reference returns.** `getComponent`, `getComponents`, `getState`, `getResource`, `getTags`, `getByTag`, and `getEvents` return values that point into engine-owned storage. The proxy `structuredClone`s their results before the predicate sees them, so a predicate that mutates a returned object ╞Æ?" e.g. `w.getComponent(e, 'hp')!.current = 0` ╞Æ?" operates on a defensive copy and the live state stays untouched.
3. **Frozen sub-objects.** `world.grid` is the only public field that is a sub-object rather than a prototype method. It is `Object.freeze`d in the constructor, so monkey-patching `w.grid.getAt = () => null` from inside a predicate throws `TypeError` in strict mode.
System.Management.Automation.RemoteException
Preconditions run in registration order at the start of `commit()` and short-circuit on the first failure. Each predicate sees the **current live state** of the world, not the transaction's proposed mutations ╞Æ?" preconditions are checked against the pre-commit baseline, not the post-commit projection.
System.Management.Automation.RemoteException
### `commit(): TransactionResult`
System.Management.Automation.RemoteException
```typescript
type TransactionResult =
  | { ok: true;  mutationsApplied: number; eventsEmitted: number }
  | { ok: false; code: 'precondition_failed'; reason: string }
  | { ok: false; code: 'aborted' };
```
System.Management.Automation.RemoteException
Runs preconditions; on any failure, returns `precondition_failed` with no mutation or event applied. Otherwise applies every buffered mutation in registration order via the corresponding public `World` API (so mutations get the same liveness, bounds, and JSON-compat validation as direct calls), then emits every buffered event via `world.emit`. Returns the success result with counts.
System.Management.Automation.RemoteException
If the transaction was previously `abort()`ed, `commit()` returns `{ ok: false, code: 'aborted' }` without throwing or mutating.
System.Management.Automation.RemoteException
`commit()` on a transaction that has already reached a terminal state throws `Error('CommandTransaction already <terminalReason>')` where `<terminalReason>` is `'committed'` after a clean commit and `'aborted'` after an `abort()` followed by `commit()` (which returns `{ ok: false, code: 'aborted' }` once and then transitions to a terminal state). Builder methods (`setComponent`, `emit`, `require`, etc.) throw the same error for the same reason.
System.Management.Automation.RemoteException
### `abort(): void`
System.Management.Automation.RemoteException
Marks a pending transaction as aborted. A subsequent `commit()` returns `{ ok: false, code: 'aborted' }` with no mutation or event applied. `abort()` on an already-committed or already-aborted transaction is a no-op.
System.Management.Automation.RemoteException
### v1 limitations
System.Management.Automation.RemoteException
- **Unbuffered ops:** `createEntity`, `destroyEntity`, `addTag`, `removeTag`, `setMeta`, `deleteMeta`, `setState`, `deleteState`, and resource registration / `setResourceMax` are not buffered. v1 covers components (set / add / patch / remove), position, events, and resource add / remove.
- **Aliasing window.** Buffered values (the `data` argument to `setComponent` / `addComponent` / `patchComponent`, the `position` argument to `setPosition`, and the `data` argument to `emit`) are stored by reference. Mutating a buffered object between the builder call and `commit()` is observable at apply time. Treat buffered values as owned by the transaction once handed over.
- **Mid-commit throw ╞Æ+' partial state, transaction consumed.** If a buffered mutation throws mid-commit (e.g., entity destroyed between buffering and commit, JSON-incompat caller-side mutation per the aliasing window above, etc.), the error propagates. Mutations 0..N-1 already applied stay applied. The transaction is still consumed (status flips to `committed` in a `finally` block), so calling `commit()` again throws ╞Æ?" the caller cannot retry and silently double-apply earlier mutations (e.g., double-debit a resource). Best practice: validate entity liveness via `require((w) => w.isAlive(entity) || 'entity dead')` before mutating.
- **Event payloads are validated at `emit()` buffer time, not at `commit()`.** Calling `emit(type, data)` with a non-JSON-cloneable payload throws immediately at the builder call, before any mutation runs. Listener exceptions during `commit()` still propagate after mutations have applied ╞Æ?" the transaction-level "all-or-nothing" promise covers preconditions and JSON-compat validation, not arbitrary exceptions thrown by listener callbacks.
- **Poisoned-world warning.** If `commit()` runs against a world that has not been recovered from a prior tick failure, it emits the standard `console.warn` once per poison cycle (`api='transaction'`). Call `world.recover()` before transacting against a previously-failed world.
System.Management.Automation.RemoteException
### Example: cost-checked build action
System.Management.Automation.RemoteException
```typescript
const result = world
  .transaction()
  .require((w) => {
    const wood = w.getResource(player, 'wood');
    return (wood?.current ?? 0) >= 80 || 'not enough wood';
  })
  .removeResource(player, 'wood', 80)
  .setComponent(site, 'building', { kind: 'house' })
  .emit('building_placed', { player, site, kind: 'house' })
  .commit();
System.Management.Automation.RemoteException
if (!result.ok) {
  console.log('build aborted:', result.code === 'precondition_failed' ? result.reason : result.code);
}
```
System.Management.Automation.RemoteException
If the player has 80+ wood, the transaction commits: wood is deducted, the building is placed, and the `building_placed` event fires ╞Æ?" all in one tick, all visible in one `TickDiff`. If the player has fewer than 80 wood, none of the changes apply and the event is not emitted.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Layer
System.Management.Automation.RemoteException
Generic typed overlay map at configurable downsampled resolution. Models field data ╞Æ?" pollution, influence, danger, weather, faith ╞Æ?" as a sparse grid where each cell covers a `blockSize A- blockSize` block of world coordinates. Standalone utility, no `World` dependency. Sibling of `OccupancyGrid` and `VisibilityMap`.
System.Management.Automation.RemoteException
```typescript
import { Layer, type LayerState } from 'civ-engine';
```
System.Management.Automation.RemoteException
### `LayerOptions<T>`
System.Management.Automation.RemoteException
```typescript
// src/layer.ts
interface LayerOptions<T> {
  worldWidth: number;
  worldHeight: number;
  blockSize?: number;     // default 1
  defaultValue: T;
}
```
System.Management.Automation.RemoteException
`worldWidth`, `worldHeight`, and `blockSize` (default `1`) must be **safe positive integers** (rejected via `Number.isSafeInteger`). The cell grid dimensions are `Math.ceil(worldWidth / blockSize)` A- `Math.ceil(worldHeight / blockSize)`; the constructor also rejects dimensions whose product exceeds `Number.MAX_SAFE_INTEGER` to keep cell-index arithmetic exact. `defaultValue` must be JSON-compatible (validated via `assertJsonCompatible`).
System.Management.Automation.RemoteException
### `LayerState<T>`
System.Management.Automation.RemoteException
```typescript
// src/layer.ts
interface LayerState<T> {
  worldWidth: number;
  worldHeight: number;
  blockSize: number;
  defaultValue: T;
  cells: Array<[number, T]>;  // sparse: [cellIndex, value]
}
```
System.Management.Automation.RemoteException
Sparse serialization. Only cells whose value differs from `defaultValue` (compared by JSON fingerprint) appear in `cells`; entries are sorted by `cellIndex` for determinism. `cellIndex = cy * width + cx`.
System.Management.Automation.RemoteException
### `new Layer<T>(options)`
System.Management.Automation.RemoteException
```typescript
new Layer<T>(options: LayerOptions<T>)
```
System.Management.Automation.RemoteException
Creates a Layer of cell type `T`. The constructor validates dimensions and JSON-compatibility, and `structuredClone`s `defaultValue` so caller mutation cannot bleed in.
System.Management.Automation.RemoteException
**Defensive-copy contract.** Values flowing across the Layer's API surface are `structuredClone`d for object `T`; for primitive `T` (`number`, `string`, `boolean`, `null`) the clone is skipped because primitives are immutable on the JS side:
System.Management.Automation.RemoteException
- **Writes** (`setCell`, `setAt`, `fill`): for object `T`, the input value is cloned before storage. Mutating the original after the call does not affect the Layer. For primitive `T`, the value is stored by value (no clone).
- **Reads** (`getCell`, `getAt`, `forEach`, `defaultValue` getter): for object `T`, the returned value is a fresh clone of internal storage. For primitive `T`, the value is returned directly.
- **Read-only traversal** (`forEachReadOnly`): zero-allocation ╞Æ?" yields the live stored reference even for object `T`. Caller must NOT mutate.
- **Serialization** (`getState`, `Layer.fromState`, `clone`): for object `T`, values are cloned at both ends.
System.Management.Automation.RemoteException
The primitive fast-path makes `Layer<number>`, `Layer<boolean>`, `Layer<string>`, and `Layer<null>` zero-allocation across reads and writes. For object `T`, cloning every read costs O(value size) per call ╞Æ?" if profiling shows this dominates, use `forEachReadOnly` in tight loops or batch reads via `getState()`.
System.Management.Automation.RemoteException
**Strip-at-write sparsity.** Writes that match `defaultValue` (by `===` for primitive `T`, by `jsonFingerprint` for object `T`) `delete` the underlying entry instead of storing it. `fill(defaultValue)` short-circuits to clearing the entire sparse map. The in-memory and canonical-sparse representations stay in sync without a `getState` round-trip.
System.Management.Automation.RemoteException
### Properties
System.Management.Automation.RemoteException
| Property | Type | Description |
|---|---|---|
| `worldWidth` | `number` | World coordinate range (read-only) |
| `worldHeight` | `number` | World coordinate range (read-only) |
| `blockSize` | `number` | Cell size in world units (read-only) |
| `width` | `number` | Cell grid width = `ceil(worldWidth / blockSize)` |
| `height` | `number` | Cell grid height = `ceil(worldHeight / blockSize)` |
| `defaultValue` | `T` | Getter returning a fresh `structuredClone` of the internal default value (mutating the result does not affect the Layer) |
System.Management.Automation.RemoteException
### `getCell(cx, cy)` / `setCell(cx, cy, value)`
System.Management.Automation.RemoteException
```typescript
getCell(cx: number, cy: number): T
setCell(cx: number, cy: number, value: T): void
```
System.Management.Automation.RemoteException
Cell-coordinate access. `cx` and `cy` must be integers in `[0, width)` A- `[0, height)` ╞Æ?" both out-of-range and non-integer inputs throw `RangeError`. `setCell` validates `value` via `assertJsonCompatible` and `structuredClone`s before storage. `getCell` `structuredClone`s before returning.
System.Management.Automation.RemoteException
### `getAt(worldX, worldY)` / `setAt(worldX, worldY, value)`
System.Management.Automation.RemoteException
```typescript
getAt(worldX: number, worldY: number): T
setAt(worldX: number, worldY: number, value: T): void
```
System.Management.Automation.RemoteException
World-coordinate access; auto-buckets to `Math.floor(worldX / blockSize)`, `Math.floor(worldY / blockSize)`. `worldX` and `worldY` must be integers in `[0, worldWidth)` A- `[0, worldHeight)` ╞Æ?" both out-of-range and non-integer inputs throw `RangeError`. Same defensive-copy contract as `getCell` / `setCell`.
System.Management.Automation.RemoteException
### `fill(value)`
System.Management.Automation.RemoteException
```typescript
fill(value: T): void
```
System.Management.Automation.RemoteException
Sets every cell to `value`. Validates once via `assertJsonCompatible`, then `structuredClone`s once per cell so each cell holds an independent copy. Subsequent `getState()` strips entries that match `defaultValue` (by `jsonFingerprint`), so `fill(defaultValue)` then `getState()` produces an empty `cells` array.
System.Management.Automation.RemoteException
### `forEach(cb)`
System.Management.Automation.RemoteException
```typescript
forEach(cb: (value: T, cx: number, cy: number) => void): void
```
System.Management.Automation.RemoteException
Visits every cell in row-major order (`cy` outer, `cx` inner). For object `T`, each invocation receives a fresh `structuredClone` ╞Æ?" mutating the callback's `value` argument does not affect the Layer. For primitive `T`, the value is passed directly (no clone). Unset cells yield `defaultValue` (cloned for object `T`).
System.Management.Automation.RemoteException
### `forEachReadOnly(cb)`
System.Management.Automation.RemoteException
```typescript
forEachReadOnly(cb: (value: T, cx: number, cy: number) => void): void
```
System.Management.Automation.RemoteException
Zero-allocation traversal. For non-default cells, yields the live stored reference. For unset cells, yields the live `_defaultValue`. **Caller must not mutate the value** ╞Æ?" for object `T` the reference is shared with internal storage. Use `forEach` if you need a defensive copy. Use `forEachReadOnly` in hot paths where you only read.
System.Management.Automation.RemoteException
### `clear(cx, cy)` / `clearAt(worldX, worldY)`
System.Management.Automation.RemoteException
```typescript
clear(cx: number, cy: number): void
clearAt(worldX: number, worldY: number): void
```
System.Management.Automation.RemoteException
Drops the cell back to default ╞Æ?" deletes the underlying sparse-map entry. Idempotent on already-default cells. Bounds-validated and integer-validated the same way as `setCell` / `setAt`.
System.Management.Automation.RemoteException
### `getState()` / `Layer.fromState(state)`
System.Management.Automation.RemoteException
```typescript
getState(): LayerState<T>
static fromState<T>(state: LayerState<T>): Layer<T>
```
System.Management.Automation.RemoteException
Round-trip serialization. `getState` strips entries that match `defaultValue` (by `jsonFingerprint`), `structuredClone`s the rest, and sorts by cell index for determinism. `Layer.fromState` validates state shape (non-null object, `cells` is an array of `[index, value]` tuples, `blockSize` is present), validates each cell index is a safe integer in `[0, width * height)`, rejects duplicates, validates each value is JSON-compatible, and **canonicalizes** by stripping any cell whose value matches `defaultValue` (so a malformed snapshot with redundant default entries normalizes on load).
System.Management.Automation.RemoteException
**Throws (fromState):**
- `TypeError` if `state` is not a non-null object
- `Error` if `state.blockSize` is `undefined` or `null`
- `TypeError` if `state.cells` is not an array
- `TypeError` if any cell entry is not a 2-element `[index, value]` tuple
- `RangeError` if any cell index is not a safe integer in `[0, width * height)`
- `Error` if any cell index appears more than once
- `Error` if any value is not JSON-compatible
System.Management.Automation.RemoteException
Note on the fingerprint comparison: `jsonFingerprint` uses `JSON.stringify`, which serializes object keys in insertion order. Two objects that are deeply equal but constructed with different key orders will not match ╞Æ?" for object-typed `T` defaults, write your values with the same key order as `defaultValue` if you want them to be stripped on serialize.
System.Management.Automation.RemoteException
### `clone()`
System.Management.Automation.RemoteException
```typescript
clone(): Layer<T>
```
System.Management.Automation.RemoteException
Returns an independent deep copy. For object `T`, every stored entry is `structuredClone`d. For primitive `T`, entries are copied by value. The implementation iterates the sparse map directly (no intermediate `getState` round-trip).
System.Management.Automation.RemoteException
### Example
System.Management.Automation.RemoteException
```typescript
const pollution = new Layer<number>({
  worldWidth: 64,
  worldHeight: 64,
  blockSize: 4, // 16 A- 16 cells
  defaultValue: 0,
});
System.Management.Automation.RemoteException
// Factory pollutes the cell containing world coord (10, 12)
pollution.setAt(10, 12, 80);
System.Management.Automation.RemoteException
// Any agent querying nearby world coords in the same 4A-4 cell sees the value
console.log(pollution.getAt(11, 13)); // 80
console.log(pollution.getAt(8, 12));  // 80 (same cell)
console.log(pollution.getAt(20, 12)); // 0  (different cell)
System.Management.Automation.RemoteException
// Snapshot for save state
const snapshot = pollution.getState();
const restored = Layer.fromState<number>(snapshot);
```
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Noise
System.Management.Automation.RemoteException
Seedable 2D simplex noise for procedural generation. Standalone utility.
System.Management.Automation.RemoteException
```typescript
import { createNoise2D, octaveNoise2D } from 'civ-engine';
```
System.Management.Automation.RemoteException
### `createNoise2D(seed)`
System.Management.Automation.RemoteException
```typescript
createNoise2D(seed: number): (x: number, y: number) => number
```
System.Management.Automation.RemoteException
Creates a noise function from a seed. The same seed always produces the same output. Returns values in `[-1, 1]`.
System.Management.Automation.RemoteException
```typescript
const noise = createNoise2D(42);
const value = noise(1.5, 2.3); // number in [-1, 1]
```
System.Management.Automation.RemoteException
### `octaveNoise2D(noise, x, y, octaves, persistence?, lacunarity?)`
System.Management.Automation.RemoteException
```typescript
octaveNoise2D(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
  persistence?: number,  // default: 0.5
  lacunarity?: number,   // default: 2.0
): number
```
System.Management.Automation.RemoteException
Layers multiple noise samples at increasing frequency and decreasing amplitude (fractal Brownian motion). Produces more natural-looking terrain than single-octave noise. Returns values in `[-1, 1]` when the input `noise` function is bounded to `[-1, 1]`.
System.Management.Automation.RemoteException
Throws `RangeError` if `octaves < 1` or non-integer, `persistence < 0` or non-finite, or `lacunarity <= 0` or non-finite.
System.Management.Automation.RemoteException
| Parameter | Default | Description |
|---|---|---|
| `octaves` | (required) | Number of noise layers (positive integer) |
| `persistence` | `0.5` | Amplitude multiplier per octave (lower = smoother; must be `>= 0`) |
| `lacunarity` | `2.0` | Frequency multiplier per octave (higher = more detail; must be `> 0`) |
System.Management.Automation.RemoteException
```typescript
const noise = createNoise2D(42);
System.Management.Automation.RemoteException
// 4 octaves for terrain generation
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const elevation = octaveNoise2D(noise, x * 0.05, y * 0.05, 4);
    // elevation: -1 (deep water) to 1 (mountain peaks)
  }
}
```
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Cellular Automata
System.Management.Automation.RemoteException
Immutable cellular automata for map generation. Each step produces a new grid. Standalone utility.
System.Management.Automation.RemoteException
```typescript
import {
  createCellGrid,
  stepCellGrid,
  MOORE_OFFSETS,
  VON_NEUMANN_OFFSETS,
  type CellGrid,
  type CellRule,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### `createCellGrid(width, height, fill)`
System.Management.Automation.RemoteException
```typescript
createCellGrid(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): CellGrid
```
System.Management.Automation.RemoteException
Creates a cell grid from a fill function. The fill function is called for every cell with its coordinates.
System.Management.Automation.RemoteException
```typescript
// Random binary grid
const grid = createCellGrid(32, 32, () => Math.random() > 0.5 ? 1 : 0);
System.Management.Automation.RemoteException
// Noise-seeded grid
const noise = createNoise2D(42);
const grid = createCellGrid(32, 32, (x, y) =>
  octaveNoise2D(noise, x * 0.1, y * 0.1, 4) > 0 ? 1 : 0
);
```
System.Management.Automation.RemoteException
### `stepCellGrid(grid, rule, offsets?)`
System.Management.Automation.RemoteException
```typescript
stepCellGrid(
  grid: CellGrid,
  rule: CellRule,
  offsets?: ReadonlyArray<[number, number]>,  // default: MOORE_OFFSETS
): CellGrid
```
System.Management.Automation.RemoteException
Produces a new grid by applying the rule function to every cell. The original grid is not mutated. Out-of-bounds neighbors are excluded (edge cells have fewer neighbors).
System.Management.Automation.RemoteException
```typescript
// Game of Life rule
const gameOfLife: CellRule = (current, neighbors) => {
  const alive = neighbors.filter(n => n === 1).length;
  if (current === 1) return (alive === 2 || alive === 3) ? 1 : 0;
  return alive === 3 ? 1 : 0;
};
System.Management.Automation.RemoteException
let grid = createCellGrid(32, 32, () => Math.random() > 0.6 ? 1 : 0);
for (let i = 0; i < 5; i++) {
  grid = stepCellGrid(grid, gameOfLife);
}
System.Management.Automation.RemoteException
// Cave generation (smoothing rule)
const caveSmooth: CellRule = (current, neighbors) => {
  const walls = neighbors.filter(n => n === 1).length;
  return walls >= 5 ? 1 : walls <= 2 ? 0 : current;
};
```
System.Management.Automation.RemoteException
### Neighborhood Constants
System.Management.Automation.RemoteException
| Constant | Pattern | Count | Description |
|---|---|---|---|
| `MOORE_OFFSETS` | 8 surrounding cells | 8 | Default. All 8 neighbors (orthogonal + diagonal) |
| `VON_NEUMANN_OFFSETS` | 4 adjacent cells | 4 | Only orthogonal neighbors (up, down, left, right) |
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Map Generation
System.Management.Automation.RemoteException
Helpers for bulk tile entity creation. Standalone utility.
System.Management.Automation.RemoteException
```typescript
import { createTileGrid, type MapGenerator } from 'civ-engine';
```
System.Management.Automation.RemoteException
### `createTileGrid(world, positionKey?)`
System.Management.Automation.RemoteException
```typescript
createTileGrid(
  world: World,
  positionKey?: string,  // default: 'position'
): EntityId[][]
```
System.Management.Automation.RemoteException
Creates one entity per grid cell and attaches a position component to each. Returns a 2D array indexed as `tiles[y][x]`.
System.Management.Automation.RemoteException
The position component must be registered on the world before calling this function.
System.Management.Automation.RemoteException
**Throws:** `Error` (via `query`) if the position component is not registered.
System.Management.Automation.RemoteException
```typescript
world.registerComponent<Position>('position');
const tiles = createTileGrid(world);
// tiles[0][0] = entity at (0, 0)
// tiles[3][5] = entity at (5, 3)
System.Management.Automation.RemoteException
// Add terrain data to tiles
world.registerComponent<{ type: string }>('terrain');
tiles[3][5]; // entity ID at x=5, y=3
world.addComponent(tiles[3][5], 'terrain', { type: 'forest' });
```
System.Management.Automation.RemoteException
### `MapGenerator` Interface
System.Management.Automation.RemoteException
```typescript
interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}
```
System.Management.Automation.RemoteException
An optional interface for organizing map generation logic. Not enforced by the engine.
System.Management.Automation.RemoteException
```typescript
const myGenerator: MapGenerator = {
  generate(world, tiles) {
    const noise = createNoise2D(42);
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const value = octaveNoise2D(noise, x * 0.05, y * 0.05, 4);
        const type = value > 0.3 ? 'mountain' : value > -0.2 ? 'grass' : 'water';
        world.addComponent(tiles[y][x], 'terrain', { type });
      }
    }
  },
};
System.Management.Automation.RemoteException
const tiles = createTileGrid(world);
myGenerator.generate(world, tiles);
```
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Behavior Tree
System.Management.Automation.RemoteException
Generic behavior tree framework for AI decision-making. Trees are structural blueprints shared across entities; per-entity execution state lives in `BTState` (stored as a component). Standalone utility.
System.Management.Automation.RemoteException
```typescript
import {
  createBehaviorTree,
  createBTState,
  NodeStatus,
  type BTState,
  type BTNode,
  type TreeBuilder,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### `createBehaviorTree<TContext>(getState, define)`
System.Management.Automation.RemoteException
```typescript
createBehaviorTree<TContext>(
  getState: (ctx: TContext) => BTState,
  define: (builder: TreeBuilder<TContext>) => BTNode<TContext>,
): BTNode<TContext>
```
System.Management.Automation.RemoteException
Creates a behavior tree. `TContext` is game-defined ╞Æ?" the engine does not prescribe what it contains.
System.Management.Automation.RemoteException
**Parameters:**
- `getState` ╞Æ?" Extracts the `BTState` from the context (used by composite nodes to track which child is running)
- `define` ╞Æ?" Builder function that constructs the tree using the `TreeBuilder` API
System.Management.Automation.RemoteException
**Returns:** The root `BTNode`, which has a `tick(context)` method and a `nodeCount` property.
System.Management.Automation.RemoteException
### `createBTState(tree)`
System.Management.Automation.RemoteException
```typescript
createBTState(tree: BTNode<unknown>): BTState
```
System.Management.Automation.RemoteException
Creates a fresh `BTState` sized to the given tree. All running indices start at `-1` (no child running).
System.Management.Automation.RemoteException
### Builder Nodes
System.Management.Automation.RemoteException
All nodes are created through the `TreeBuilder` passed to the `define` callback:
System.Management.Automation.RemoteException
#### `builder.action(fn)`
System.Management.Automation.RemoteException
Leaf node that runs a function returning `NodeStatus`. Use for concrete actions (move, attack, gather).
System.Management.Automation.RemoteException
```typescript
builder.action((ctx) => {
  // do something
  return NodeStatus.SUCCESS;
});
```
System.Management.Automation.RemoteException
#### `builder.condition(fn)`
System.Management.Automation.RemoteException
Leaf node that runs a boolean test. Returns `SUCCESS` if true, `FAILURE` if false.
System.Management.Automation.RemoteException
```typescript
builder.condition((ctx) => ctx.health > 0);
```
System.Management.Automation.RemoteException
#### `builder.selector(children)`
System.Management.Automation.RemoteException
Composite node that tries children left-to-right until one succeeds or returns `RUNNING`. If all fail, the selector fails. Resumes from the running child on the next tick.
System.Management.Automation.RemoteException
```typescript
builder.selector([
  builder.condition((ctx) => ctx.hasFood),
  builder.action((ctx) => { ctx.forage(); return NodeStatus.SUCCESS; }),
]);
```
System.Management.Automation.RemoteException
#### `builder.sequence(children)`
System.Management.Automation.RemoteException
Composite node that runs children left-to-right until one fails or returns `RUNNING`. If all succeed, the sequence succeeds. Resumes from the running child on the next tick.
System.Management.Automation.RemoteException
```typescript
builder.sequence([
  builder.condition((ctx) => ctx.hasTarget),
  builder.action((ctx) => ctx.moveToTarget()),
  builder.action((ctx) => ctx.attack()),
]);
```
System.Management.Automation.RemoteException
#### `builder.reactiveSelector(children)`
System.Management.Automation.RemoteException
Like `selector`, but does not persist running state across ticks. Each tick re-evaluates children from index 0. Use when higher-priority children must pre-empt a previously running lower-priority branch (e.g., a sleep/eat need should interrupt a work branch).
System.Management.Automation.RemoteException
```typescript
builder.reactiveSelector([
  builder.sequence([
    builder.condition((ctx) => ctx.energy < 0.2),
    builder.action((ctx) => ctx.sleep()),
  ]),
  builder.action((ctx) => ctx.work()),
]);
```
System.Management.Automation.RemoteException
#### `builder.reactiveSequence(children)`
System.Management.Automation.RemoteException
Like `sequence`, but does not persist running state across ticks. Each tick restarts evaluation from child 0. Use with a `condition` as the first child to get guard-then-body semantics that re-check the guard every tick.
System.Management.Automation.RemoteException
```typescript
builder.reactiveSequence([
  builder.condition((ctx) => ctx.hasTarget),
  builder.action((ctx) => ctx.advance()),
]);
```
System.Management.Automation.RemoteException
#### `clearRunningState(state, node?)`
System.Management.Automation.RemoteException
```typescript
clearRunningState(state: BTState, node?: BTNode<unknown>): void
```
System.Management.Automation.RemoteException
Resets running indices in a `BTState`. Without `node`, resets the entire tree. With `node`, resets only the subtree rooted at `node` ╞Æ?" useful when external events (job reassignment, loot pickup) should interrupt a currently running branch.
System.Management.Automation.RemoteException
```typescript
import { clearRunningState } from 'civ-engine';
// Full reset
clearRunningState(entity.btState);
// Subtree reset
clearRunningState(entity.btState, subtreeRoot);
```
System.Management.Automation.RemoteException
### Complete Example
System.Management.Automation.RemoteException
```typescript
import {
  World,
  createBehaviorTree,
  createBTState,
  NodeStatus,
  type BTState,
  type BTNode,
  type Position,
  type EntityId,
} from 'civ-engine';
System.Management.Automation.RemoteException
// Define game-specific context
interface AIContext {
  entityId: EntityId;
  world: World;
  btState: BTState;
}
System.Management.Automation.RemoteException
// Define the behavior tree (shared across all entities)
const tree: BTNode<AIContext> = createBehaviorTree<AIContext>(
  (ctx) => ctx.btState,
  (b) =>
    b.selector([
      // Priority 1: flee if low health
      b.sequence([
        b.condition((ctx) => {
          const hp = ctx.world.getComponent<{ hp: number }>(ctx.entityId, 'health');
          return hp !== undefined && hp.hp < 20;
        }),
        b.action((ctx) => {
          // flee logic
          return NodeStatus.SUCCESS;
        }),
      ]),
      // Priority 2: attack nearby enemy
      b.sequence([
        b.condition((ctx) => {
          const pos = ctx.world.getComponent<Position>(ctx.entityId, 'position')!;
          const nearby = ctx.world.grid.getNeighbors(pos.x, pos.y);
          return nearby.length > 0;
        }),
        b.action((ctx) => {
          // attack logic
          return NodeStatus.SUCCESS;
        }),
      ]),
      // Priority 3: wander
      b.action((ctx) => {
        // wander logic
        return NodeStatus.SUCCESS;
      }),
    ]),
);
System.Management.Automation.RemoteException
// Store BTState as a component
world.registerComponent<BTState>('btState');
System.Management.Automation.RemoteException
// Create an entity with AI
const unit = world.createEntity();
world.addComponent(unit, 'btState', createBTState(tree));
System.Management.Automation.RemoteException
// System that ticks behavior trees
function aiSystem(w: World): void {
  for (const id of w.query('btState', 'position')) {
    const btState = w.getComponent<BTState>(id, 'btState')!;
    const ctx: AIContext = { entityId: id, world: w, btState };
    tree.tick(ctx);
  }
}
System.Management.Automation.RemoteException
world.registerSystem(aiSystem);
```
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Client Adapter
System.Management.Automation.RemoteException
Transport-agnostic bridge between the World and external clients. The adapter serializes world state into typed messages and dispatches incoming commands. Standalone class that uses only World's public API.
System.Management.Automation.RemoteException
```typescript
import {
  ClientAdapter,
  type ServerMessage,
  type ClientMessage,
  type GameEvent,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new ClientAdapter<TEventMap, TCommandMap>(config: {
  world: World<TEventMap, TCommandMap>;
  send: (message: ServerMessage<TEventMap>) => void;
  onError?: (error: unknown) => void;
})
```
System.Management.Automation.RemoteException
| Parameter | Description |
|---|---|
| `world` | The World instance to bridge |
| `send` | Callback invoked for every outgoing server message |
| `onError` | Optional callback invoked when `send` throws; the adapter disconnects after reporting |
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `connect()`
System.Management.Automation.RemoteException
```typescript
connect(): void
```
System.Management.Automation.RemoteException
Starts streaming. Immediately sends a `snapshot` message with the full world state, then subscribes to diffs, command execution results, and tick failures. No-op if already connected.
System.Management.Automation.RemoteException
#### `disconnect()`
System.Management.Automation.RemoteException
```typescript
disconnect(): void
```
System.Management.Automation.RemoteException
Stops streaming. Unsubscribes from diffs. No-op if already disconnected.
System.Management.Automation.RemoteException
#### `handleMessage(message)`
System.Management.Automation.RemoteException
```typescript
handleMessage(message: ClientMessage<TCommandMap> | unknown): void
```
System.Management.Automation.RemoteException
Processes an incoming client message:
System.Management.Automation.RemoteException
| Message type | Behavior |
|---|---|
| `command` | Validates the envelope, rejects unhandled command types, then calls `world.submitWithResult()`. Sends `commandAccepted` on success or `commandRejected` with structured error fields on failure. If the command was queued, later streams `commandExecuted` or `commandFailed` after tick processing |
| `requestSnapshot` | Sends a `snapshot` message with the current world state |
System.Management.Automation.RemoteException
Malformed messages without a usable `type` are ignored. Malformed command envelopes with an ID are rejected when the adapter can safely identify which command to reject.
System.Management.Automation.RemoteException
### WebSocket Example
System.Management.Automation.RemoteException
```typescript
import { WebSocketServer } from 'ws';
System.Management.Automation.RemoteException
const wss = new WebSocketServer({ port: 8080 });
System.Management.Automation.RemoteException
wss.on('connection', (ws) => {
  const adapter = new ClientAdapter({
    world,
    send: (msg) => ws.send(JSON.stringify(msg)),
  });
System.Management.Automation.RemoteException
  ws.on('message', (data) => {
    adapter.handleMessage(JSON.parse(data.toString()));
  });
System.Management.Automation.RemoteException
  ws.on('close', () => adapter.disconnect());
System.Management.Automation.RemoteException
  adapter.connect();
});
```
System.Management.Automation.RemoteException
### stdin/stdout Example (for AI agents)
System.Management.Automation.RemoteException
```typescript
import * as readline from 'readline';
System.Management.Automation.RemoteException
const rl = readline.createInterface({ input: process.stdin });
System.Management.Automation.RemoteException
const adapter = new ClientAdapter({
  world,
  send: (msg) => {
    process.stdout.write(JSON.stringify(msg) + '\n');
  },
});
System.Management.Automation.RemoteException
rl.on('line', (line) => {
  adapter.handleMessage(JSON.parse(line));
});
System.Management.Automation.RemoteException
adapter.connect();
```
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Render Adapter
System.Management.Automation.RemoteException
Projection boundary for renderer-facing snapshots and per-tick diffs. The engine stays headless; the game provides projection callbacks that decide what render state each entity exposes.
System.Management.Automation.RemoteException
```typescript
import {
  RenderAdapter,
  type RenderDiff,
  type RenderEntity,
  type RenderProjector,
  type RenderServerMessage,
  type RenderSnapshot,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Core Types
System.Management.Automation.RemoteException
#### `RenderEntity<TView>`
System.Management.Automation.RemoteException
```typescript
interface RenderEntity<TView> {
  ref: EntityRef;
  view: TView;
}
```
System.Management.Automation.RemoteException
Projected renderable entity with a generation-aware entity reference.
System.Management.Automation.RemoteException
#### `RenderSnapshot<TView, TFrame>`
System.Management.Automation.RemoteException
```typescript
interface RenderSnapshot<TView, TFrame> {
  tick: number;
  entities: Array<RenderEntity<TView>>;
  frame: TFrame | null;
}
```
System.Management.Automation.RemoteException
Full projected render state for initial sync or resync.
System.Management.Automation.RemoteException
#### `RenderDiff<TView, TFrame>`
System.Management.Automation.RemoteException
```typescript
interface RenderDiff<TView, TFrame> {
  tick: number;
  created: Array<RenderEntity<TView>>;
  updated: Array<RenderEntity<TView>>;
  destroyed: EntityRef[];
  frame: TFrame | null;
}
```
System.Management.Automation.RemoteException
Incremental projected render update for one simulation tick.
System.Management.Automation.RemoteException
#### `RenderEntityChange`
System.Management.Automation.RemoteException
```typescript
interface RenderEntityChange {
  id: EntityId;
  created: boolean;
  destroyed: boolean;
  componentKeys: string[];
  resourceKeys: string[];
  previousRef: EntityRef | null;
  currentRef: EntityRef | null;
}
```
System.Management.Automation.RemoteException
Summary of why an entity was considered for re-projection on a tick.
System.Management.Automation.RemoteException
#### `RenderProjector<TEventMap, TCommandMap, TView, TFrame>`
System.Management.Automation.RemoteException
```typescript
interface RenderProjector<TEventMap, TCommandMap, TView, TFrame> {
  projectEntity(
    ref: EntityRef,
    world: World<TEventMap, TCommandMap>,
    change: RenderEntityChange | null,
  ): TView | null;
  projectFrame?(
    world: World<TEventMap, TCommandMap>,
    diff: TickDiff | null,
  ): TFrame | null;
  shouldProjectChange?(change: RenderEntityChange): boolean;
}
```
System.Management.Automation.RemoteException
Game-owned callbacks that map simulation state to render-facing state.
System.Management.Automation.RemoteException
#### `RenderServerMessage<TView, TFrame, TDebug>`
System.Management.Automation.RemoteException
```typescript
type RenderServerMessage<TView, TFrame, TDebug> =
  | { type: 'renderSnapshot'; data: { render: RenderSnapshot<TView, TFrame>; debug: TDebug | null } }
  | { type: 'renderTick'; data: { render: RenderDiff<TView, TFrame>; debug: TDebug | null } };
```
System.Management.Automation.RemoteException
Message union emitted by `RenderAdapter`.
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new RenderAdapter<TEventMap, TCommandMap, TView, TFrame, TDebug>(config: {
  world: World<TEventMap, TCommandMap>;
  projector: RenderProjector<TEventMap, TCommandMap, TView, TFrame>;
  send: (message: RenderServerMessage<TView, TFrame, TDebug>) => void;
  onError?: (error: unknown) => void;
  debug?: { capture(): TDebug | null };
})
```
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `connect()`
System.Management.Automation.RemoteException
```typescript
connect(): void
```
System.Management.Automation.RemoteException
Immediately sends a `renderSnapshot` message, then subscribes to world diffs and emits `renderTick` messages after each step.
System.Management.Automation.RemoteException
#### `disconnect()`
System.Management.Automation.RemoteException
```typescript
disconnect(): void
```
System.Management.Automation.RemoteException
Stops streaming render messages.
System.Management.Automation.RemoteException
### Behavior Notes
System.Management.Automation.RemoteException
- Render messages use `EntityRef` values so same-tick ID recycling is unambiguous.
- `projectEntity()` returning `null` removes an entity from the render surface without destroying it in the simulation.
- `debug.capture()` is optional and can attach structured debugger output to each render message.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## Scenario Runner
System.Management.Automation.RemoteException
Headless setup/run/check harness for deterministic experiments. Intended for AI agents, integration tests, and debug workflows that need one structured result object instead of ad hoc setup code.
System.Management.Automation.RemoteException
```typescript
import {
  runScenario,
  type ScenarioCapture,
  type ScenarioCheck,
  type ScenarioContext,
  type ScenarioFailure,
  type ScenarioResult,
  type ScenarioStepUntilResult,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Core Types
System.Management.Automation.RemoteException
#### `ScenarioFailure`
System.Management.Automation.RemoteException
```typescript
interface ScenarioFailure {
  code: string;
  message: string;
  source?: 'setup' | 'run' | 'stepUntil' | 'check' | 'tick';
  details?: JsonValue;
}
```
System.Management.Automation.RemoteException
Structured failure object used by runner-level failures, `stepUntil()`, and checks.
System.Management.Automation.RemoteException
#### `ScenarioCheck`
System.Management.Automation.RemoteException
```typescript
interface ScenarioCheck<TEventMap, TCommandMap> {
  name: string;
  check(
    context: ScenarioContext<TEventMap, TCommandMap>,
  ): boolean | ScenarioFailure;
}
```
System.Management.Automation.RemoteException
Post-run check evaluated after `run()`.
System.Management.Automation.RemoteException
#### `ScenarioContext`
System.Management.Automation.RemoteException
```typescript
interface ScenarioContext<TEventMap, TCommandMap> {
  name: string;
  world: World<TEventMap, TCommandMap>;
  debugger: WorldDebugger<TEventMap, TCommandMap>;
  history: WorldHistoryRecorder<TEventMap, TCommandMap, WorldDebugSnapshot>;
  submit<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): CommandSubmissionResult<K>;
  step(count?: number): ScenarioCapture<TEventMap, TCommandMap>;
  stepUntil(
    predicate: (context: ScenarioContext<TEventMap, TCommandMap>) => boolean,
    options?: {
      maxTicks?: number;
      code?: string;
      message?: string;
      details?: JsonValue;
    },
  ): ScenarioStepUntilResult;
  capture(): ScenarioCapture<TEventMap, TCommandMap>;
  fail(
    code: string,
    message: string,
    details?: JsonValue,
    source?: ScenarioFailure['source'],
  ): ScenarioFailure;
}
```
System.Management.Automation.RemoteException
Runtime helpers exposed to `setup()`, `run()`, and checks.
System.Management.Automation.RemoteException
#### `ScenarioStepUntilResult`
System.Management.Automation.RemoteException
```typescript
interface ScenarioStepUntilResult {
  completed: boolean;
  steps: number;
  tick: number;
  failure: ScenarioFailure | null;
}
```
System.Management.Automation.RemoteException
Bounded loop result returned by `context.stepUntil()`.
System.Management.Automation.RemoteException
#### `ScenarioResult`
System.Management.Automation.RemoteException
```typescript
interface ScenarioResult<TEventMap, TCommandMap>
  extends ScenarioCapture<TEventMap, TCommandMap> {
  name: string;
  passed: boolean;
  failure: ScenarioFailure | null;
  checks: ScenarioCheckOutcome[];
  issues: DebugIssue[];
}
```
System.Management.Automation.RemoteException
Final machine-readable result from `runScenario()`.
`ScenarioCapture` and `ScenarioResult` include `schemaVersion`.
System.Management.Automation.RemoteException
### `runScenario(config)`
System.Management.Automation.RemoteException
```typescript
runScenario<TEventMap, TCommandMap>(config: {
  name: string;
  world: World<TEventMap, TCommandMap>;
  debugger?: WorldDebugger<TEventMap, TCommandMap>;
  probes?: DebugProbe[];
  history?: {
    capacity?: number;
    commandCapacity?: number;
    captureInitialSnapshot?: boolean;
  };
  setup?(context: ScenarioContext<TEventMap, TCommandMap>): void;
  run?(
    context: ScenarioContext<TEventMap, TCommandMap>,
  ): void | ScenarioFailure | null;
  checks?: Array<ScenarioCheck<TEventMap, TCommandMap>>;
}): ScenarioResult<TEventMap, TCommandMap>
```
System.Management.Automation.RemoteException
Runs a scenario and returns the final structured result.
System.Management.Automation.RemoteException
### Behavior Notes
System.Management.Automation.RemoteException
- The runner creates a `WorldHistoryRecorder` and clears it after `setup()`, so the recorded initial snapshot reflects the prepared scenario state.
- `submit()` inside the scenario context calls `world.submitWithResult()`.
- `step()` inside the scenario context uses `world.stepWithResult()`, so runtime tick failures are converted into structured scenario failures.
- `stepUntil()` returns a structured timeout failure instead of forcing the caller to throw.
- Exceptions thrown by `setup()`, `run()`, or checks are converted into structured runner failures when possible.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## World History Recorder
System.Management.Automation.RemoteException
Short-horizon recorder for recent command outcomes and tick traces. Useful for AI agents, tests, and debug tooling that need recent history without building a full replay system.
System.Management.Automation.RemoteException
```typescript
import {
  WorldHistoryRecorder,
  summarizeWorldHistoryRange,
  type WorldHistoryRangeSummary,
  type WorldHistoryState,
  type WorldHistoryTick,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new WorldHistoryRecorder<TEventMap, TCommandMap, TDebug>(config: {
  world: World<TEventMap, TCommandMap>;
  capacity?: number;
  commandCapacity?: number;
  debug?: { capture(): TDebug | null };
  captureInitialSnapshot?: boolean;
})
```
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `connect()`
System.Management.Automation.RemoteException
```typescript
connect(): void
```
System.Management.Automation.RemoteException
Starts recording world diffs and command outcomes. Optionally stores an initial snapshot.
Starts recording world diffs, command submission outcomes, command execution outcomes, and tick failures. Optionally stores an initial snapshot.
System.Management.Automation.RemoteException
#### `disconnect()`
System.Management.Automation.RemoteException
```typescript
disconnect(): void
```
System.Management.Automation.RemoteException
Stops recording.
System.Management.Automation.RemoteException
#### `clear()`
System.Management.Automation.RemoteException
```typescript
clear(): void
```
System.Management.Automation.RemoteException
Clears recorded history and refreshes the initial snapshot if `captureInitialSnapshot` is enabled.
System.Management.Automation.RemoteException
#### `getTickHistory()`
System.Management.Automation.RemoteException
```typescript
getTickHistory(): Array<WorldHistoryTick<TEventMap, TDebug>>
```
System.Management.Automation.RemoteException
Returns cloned recent tick entries.
System.Management.Automation.RemoteException
#### `getCommandHistory()`
System.Management.Automation.RemoteException
```typescript
getCommandHistory(): Array<CommandSubmissionResult<keyof TCommandMap>>
```
System.Management.Automation.RemoteException
Returns cloned recent command outcomes.
System.Management.Automation.RemoteException
#### `getCommandExecutionHistory()`
System.Management.Automation.RemoteException
```typescript
getCommandExecutionHistory(): Array<CommandExecutionResult<keyof TCommandMap>>
```
System.Management.Automation.RemoteException
Returns cloned recent command execution outcomes.
System.Management.Automation.RemoteException
#### `getTickFailureHistory()`
System.Management.Automation.RemoteException
```typescript
getTickFailureHistory(): TickFailure[]
```
System.Management.Automation.RemoteException
Returns cloned recent tick failures.
System.Management.Automation.RemoteException
#### `findTick(tick)`
System.Management.Automation.RemoteException
```typescript
findTick(tick: number): WorldHistoryTick<TEventMap, TDebug> | null
```
System.Management.Automation.RemoteException
Returns one recorded tick entry or `null`.
System.Management.Automation.RemoteException
#### `getState()`
System.Management.Automation.RemoteException
```typescript
getState(): WorldHistoryState<TEventMap, TCommandMap, TDebug>
```
System.Management.Automation.RemoteException
Returns the full recorder state: initial snapshot, recent ticks, recent command submission outcomes, recent command execution outcomes, and recent tick failures.
The returned `WorldHistoryState` includes `schemaVersion`.
System.Management.Automation.RemoteException
#### `summarizeWorldHistoryRange(state, options?)`
System.Management.Automation.RemoteException
```typescript
summarizeWorldHistoryRange<TEventMap, TCommandMap>(
  state: WorldHistoryState<TEventMap, TCommandMap, WorldDebugSnapshot>,
  options?: { startTick?: number; endTick?: number },
): WorldHistoryRangeSummary | null
```
System.Management.Automation.RemoteException
Aggregates a short tick window into one machine-readable summary covering changed entity IDs, command submission outcomes, command execution outcomes, tick-failure codes, events, diff totals, and debugger issue counts.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## World Debugger
System.Management.Automation.RemoteException
Structured headless debugger for inspecting world state, last diff summary, metrics, and optional probe data.
System.Management.Automation.RemoteException
```typescript
import {
  WorldDebugger,
  createOccupancyDebugProbe,
  createPathQueueDebugProbe,
  createVisibilityDebugProbe,
} from 'civ-engine';
```
System.Management.Automation.RemoteException
### Constructor
System.Management.Automation.RemoteException
```typescript
new WorldDebugger<TEventMap, TCommandMap>(config: {
  world: World<TEventMap, TCommandMap>;
  probes?: Array<DebugProbe>;
})
```
System.Management.Automation.RemoteException
### Methods
System.Management.Automation.RemoteException
#### `addProbe(probe)`
System.Management.Automation.RemoteException
```typescript
addProbe(probe: DebugProbe): void
```
System.Management.Automation.RemoteException
Registers a custom JSON-compatible debug probe.
System.Management.Automation.RemoteException
#### `removeProbe(key)`
System.Management.Automation.RemoteException
```typescript
removeProbe(key: string): void
```
System.Management.Automation.RemoteException
Removes a probe by key.
System.Management.Automation.RemoteException
#### `capture()`
System.Management.Automation.RemoteException
```typescript
capture(): WorldDebugSnapshot
```
System.Management.Automation.RemoteException
Returns a structured debug snapshot containing:
System.Management.Automation.RemoteException
- `schemaVersion`
- world/entity/component/resource summaries
- spatial density information
- current event counts
- `world.getMetrics()` output
- last diff summary
- `world.getLastTickFailure()` output
- machine-readable `issues`, including tick-budget diagnostics and diff hazards
- compatibility `warnings` derived from those issues
- custom probe payloads
System.Management.Automation.RemoteException
### Probe Helpers
System.Management.Automation.RemoteException
```typescript
createOccupancyDebugProbe(key: string, occupancy: OccupancyGrid): DebugProbe
createVisibilityDebugProbe(key: string, visibility: VisibilityMap): DebugProbe
createPathQueueDebugProbe(
  key: string,
  queue: { getStats(): PathRequestQueueStats },
): DebugProbe
```
System.Management.Automation.RemoteException
These helpers expose standalone utility state through the same debugger surface.
System.Management.Automation.RemoteException
## Session Recording ╞Æ?" Bundle Types & Errors
System.Management.Automation.RemoteException
The session-recording subsystem captures deterministic, replayable bundles of `World` runs. This section documents the bundle / marker / error type definitions; subsequent sections cover the sink interfaces, recorder, replayer, and scenario adapter.
System.Management.Automation.RemoteException
See `docs/guides/session-recording.md` for the user-facing guide and `docs/design/2026-04-26-session-recording-and-replay-design.md` for the full subsystem design.
System.Management.Automation.RemoteException
### `SessionBundle`
System.Management.Automation.RemoteException
```typescript
const SESSION_BUNDLE_SCHEMA_VERSION = 1;
System.Management.Automation.RemoteException
interface SessionBundle<
  TEventMap = Record<string, never>,
  TCommandMap = Record<string, never>,
  TDebug = JsonValue,
> {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  initialSnapshot: WorldSnapshot;
  ticks: SessionTickEntry<TEventMap, TDebug>[];
  commands: RecordedCommand<TCommandMap>[];
  executions: CommandExecutionResult<keyof TCommandMap>[];
  failures: TickFailure[];
  snapshots: SessionSnapshotEntry[];
  markers: Marker[];
  attachments: AttachmentDescriptor[];
}
```
System.Management.Automation.RemoteException
Strict JSON: `JSON.stringify(bundle)` is a complete, lossless representation of everything in the JSON shape (sidecar attachment bytes are stored externally; consumers retrieve them via `source.readSidecar(id)` once T2 lands).
System.Management.Automation.RemoteException
### `SessionMetadata`
System.Management.Automation.RemoteException
```typescript
interface SessionMetadata {
  sessionId: string;          // UUID v4
  engineVersion: string;      // ENGINE_VERSION at recording time
  nodeVersion: string;        // process.version at recording time
  recordedAt: string;         // ISO 8601 timestamp
  startTick: number;          // tick at connect()
  endTick: number;            // tick at disconnect() (live world.tick)
  persistedEndTick: number;   // tick of last successfully persisted snapshot
  durationTicks: number;      // endTick - startTick
  sourceKind: 'session' | 'scenario' | 'synthetic';  // 'synthetic' added in v0.8.0 (b-bump per ADR 20)
  sourceLabel?: string;
  incomplete?: true;          // set when recorder did not reach disconnect cleanly
  failedTicks?: number[];     // ticks at-or-after which replay refuses (TickFailure spans)
  policySeed?: number;        // populated only when sourceKind === 'synthetic' (added in v0.8.0)
}
```
System.Management.Automation.RemoteException
`endTick` is the live world tick at finalization regardless of persistence success; `persistedEndTick` is the upper bound for incomplete-bundle replay (per spec A5.2 manifest cadence).
System.Management.Automation.RemoteException
### `Marker`
System.Management.Automation.RemoteException
```typescript
type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
type MarkerProvenance = 'engine' | 'game';
System.Management.Automation.RemoteException
interface EntityRef { id: number; generation: number; }
System.Management.Automation.RemoteException
interface MarkerRefs {
  entities?: EntityRef[];                           // matched by id + generation
  cells?: Position[];                               // must be in-bounds
  tickRange?: { from: number; to: number };
}
System.Management.Automation.RemoteException
interface Marker {
  id: string;                  // UUID v4
  tick: number;                // engine tick the marker references; >= 0
  kind: MarkerKind;
  provenance: MarkerProvenance;
  text?: string;
  refs?: MarkerRefs;
  data?: JsonValue;            // opaque game payload
  attachments?: string[];      // attachment ids
  createdAt?: string;          // ISO 8601 (recorder fills in if omitted)
  validated?: false;           // retroactive markers; entity-liveness skipped
}
```
System.Management.Automation.RemoteException
`MarkerProvenance.engine` is reserved for `scenarioResultToBundle()`; recorder-added markers always get `provenance: 'game'`.
System.Management.Automation.RemoteException
### `RecordedCommand`
System.Management.Automation.RemoteException
```typescript
interface RecordedCommand<TCommandMap = Record<string, unknown>> {
  submissionTick: number;     // CommandSubmissionResult.tick (observable tick at submit)
  sequence: number;           // CommandSubmissionResult.sequence; orders within a tick
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
  result: CommandSubmissionResult<keyof TCommandMap>;
}
```
System.Management.Automation.RemoteException
Replay-ready: carries the original `data` payload that `CommandSubmissionResult` alone does not.
System.Management.Automation.RemoteException
### `AttachmentDescriptor`
System.Management.Automation.RemoteException
```typescript
interface AttachmentDescriptor {
  id: string;                 // UUID v4
  mime: string;
  sizeBytes: number;
  ref: { dataUrl: string } | { sidecar: true };
}
```
System.Management.Automation.RemoteException
Two ref shapes: `{ dataUrl }` embeds bytes as `data:<mime>;base64,...` directly in the bundle JSON; `{ sidecar: true }` stores bytes externally (FileSink: `attachments/<id>.<ext>`; MemorySink: parallel internal map accessed via `source.readSidecar(id)`).
System.Management.Automation.RemoteException
### Error Hierarchy
System.Management.Automation.RemoteException
```typescript
class SessionRecordingError extends Error {
  readonly details: JsonValue | undefined;
  constructor(message: string, details?: JsonValue);
}
System.Management.Automation.RemoteException
class MarkerValidationError extends SessionRecordingError {
  readonly referencesValidationRule: string | undefined;
  constructor(message: string, details?: JsonValue, referencesValidationRule?: string);
}
System.Management.Automation.RemoteException
class RecorderClosedError extends SessionRecordingError;     // post-disconnect, poisoned-world, recorder_already_attached
class SinkWriteError extends SessionRecordingError;          // I/O failure during recording
class BundleVersionError extends SessionRecordingError;      // schemaVersion / engineVersion incompat
class BundleRangeError extends SessionRecordingError;        // openAt / tickEntriesBetween out-of-range
class BundleIntegrityError extends SessionRecordingError;    // structural; replay_across_failure / no_replay_payloads / no_initial_snapshot
class ReplayHandlerMissingError extends SessionRecordingError;  // worldFactory drift on a recorded command type
```
System.Management.Automation.RemoteException
Catch sites that care about cause use `instanceof <Subclass>`; catch sites that just want "any session-recording problem" use `instanceof SessionRecordingError`.
System.Management.Automation.RemoteException
### `ENGINE_VERSION`
System.Management.Automation.RemoteException
```typescript
const ENGINE_VERSION: string;  // matches package.json's `version` field
```
System.Management.Automation.RemoteException
Read by `SessionRecorder` and `scenarioResultToBundle()` for `metadata.engineVersion`. Kept in sync with `package.json`'s `version` by the release process.
System.Management.Automation.RemoteException
## Session Recording ╞Æ?" Sinks (SessionSink, SessionSource, MemorySink)
System.Management.Automation.RemoteException
`SessionSink` (write) / `SessionSource` (read) interfaces plus `MemorySink` reference implementation. Bundle types travel through these.
System.Management.Automation.RemoteException
### `SessionSink`
System.Management.Automation.RemoteException
```typescript
interface SessionSink {
  open(metadata: SessionMetadata): void;
  writeTick(entry: SessionTickEntry): void;
  writeCommand(record: RecordedCommand): void;
  writeCommandExecution(result: CommandExecutionResult): void;
  writeTickFailure(failure: TickFailure): void;
  writeSnapshot(entry: SessionSnapshotEntry): void;
  writeMarker(marker: Marker): void;
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor;
  close(): void;
}
```
System.Management.Automation.RemoteException
All methods are synchronous (per spec A8 ╞Æ?" composes with `World.onDiff`'s synchronous listener invariants). `writeAttachment` returns the finalized descriptor (sinks may rewrite `ref` from `{ dataUrl: '<placeholder>' }` to a populated data URL, or downgrade to sidecar).
System.Management.Automation.RemoteException
### `SessionSource`
System.Management.Automation.RemoteException
```typescript
interface SessionSource {
  readonly metadata: SessionMetadata;
  readSnapshot(tick: number): WorldSnapshot;
  readSidecar(id: string): Uint8Array;
  ticks(): IterableIterator<SessionTickEntry>;
  commands(): IterableIterator<RecordedCommand>;
  executions(): IterableIterator<CommandExecutionResult>;
  failures(): IterableIterator<TickFailure>;
  markers(): IterableIterator<Marker>;
  attachments(): IterableIterator<AttachmentDescriptor>;
  toBundle(): SessionBundle;
}
```
System.Management.Automation.RemoteException
Read interface paired with `SessionSink`. `MemorySink` and `FileSink` both implement the union (`SessionSink & SessionSource`).
System.Management.Automation.RemoteException
### `MemorySink`
System.Management.Automation.RemoteException
```typescript
new MemorySink(options?: MemorySinkOptions);
System.Management.Automation.RemoteException
interface MemorySinkOptions {
  allowSidecar?: boolean;          // default false; oversize attachments throw without it
  sidecarThresholdBytes?: number;  // default 65536 (64 KiB)
}
```
System.Management.Automation.RemoteException
Holds writes in in-memory arrays. Sidecar attachment bytes go in a parallel internal `Map<string, Uint8Array>` accessed via `readSidecar(id)`.
System.Management.Automation.RemoteException
Defaults: attachments under the threshold embed as `data:<mime>;base64,...` URLs in the manifest. Attachments over the threshold throw `SinkWriteError(code: 'oversize_attachment')` UNLESS `allowSidecar: true` is set, in which case they're stored as sidecars. Callers can also force sidecar storage explicitly by passing `ref: { sidecar: true }` to `writeAttachment`.
System.Management.Automation.RemoteException
`toBundle()` returns the canonical strict-JSON `SessionBundle`. The first written snapshot becomes `bundle.initialSnapshot`; subsequent snapshots populate `bundle.snapshots[]`. Throws `SinkWriteError(code: 'no_snapshots')` if no snapshots have been written.
System.Management.Automation.RemoteException
## Session Recording ╞Æ?" FileSink
System.Management.Automation.RemoteException
Disk-backed `SessionSink & SessionSource`.
System.Management.Automation.RemoteException
### `FileSink`
System.Management.Automation.RemoteException
```typescript
new FileSink(bundleDir: string);
```
System.Management.Automation.RemoteException
On-disk layout:
System.Management.Automation.RemoteException
```
<bundleDir>/
  manifest.json            // SessionMetadata + dataUrl attachments + sidecar refs
  ticks.jsonl              // append-only; one SessionTickEntry per line
  commands.jsonl           // append-only; one RecordedCommand per line
  executions.jsonl         // append-only; one CommandExecutionResult per line
  failures.jsonl           // append-only; one TickFailure per line
  markers.jsonl            // append-only; one Marker per line
  snapshots/<tick>.json    // one snapshot per file
  attachments/<id>.<ext>   // sidecar bytes (extension from MIME table)
```
System.Management.Automation.RemoteException
Manifest is rewritten on `open()`, on each `writeSnapshot()` (advancing `metadata.persistedEndTick`), and on `close()` ╞Æ?" atomic via `.tmp.json` ╞Æ+' `.json` rename. Per-tick rewrites are NOT performed.
System.Management.Automation.RemoteException
**Default attachment policy: sidecar.** FileSink is disk-backed; the disk-storage path is the natural default. Pass `descriptor.ref: { dataUrl: '<placeholder>' }` to opt into manifest embedding (only useful for very small blobs).
System.Management.Automation.RemoteException
**MIME ╞Æ+' file extension table:** `image/png` ╞Æ+' `.png`, `image/jpeg` ╞Æ+' `.jpg`, `image/gif` ╞Æ+' `.gif`, `image/webp` ╞Æ+' `.webp`, `image/svg+xml` ╞Æ+' `.svg`, `application/json` ╞Æ+' `.json`, `application/octet-stream` ╞Æ+' `.bin`, `text/plain` ╞Æ+' `.txt`, `text/csv` ╞Æ+' `.csv`. Unknown MIMEs fall back to `.bin`. The manifest carries the full MIME so readers can recover the original.
System.Management.Automation.RemoteException
`SessionSource` methods:
- `readSnapshot(tick)`: reads from `snapshots/<tick>.json`. Throws if missing.
- `readSidecar(id)`: reads from `attachments/<id>.<ext>`. Throws if the descriptor is `dataUrl`-mode rather than sidecar.
- `ticks()`, `commands()`, `executions()`, `failures()`, `markers()`: lazy generators streaming the JSONL files. Tolerate a trailing partial line (e.g. a crash mid-write).
- `toBundle()`: reads all snapshot files, sorts numerically, returns a `SessionBundle` whose `initialSnapshot` is the lowest-tick snapshot.
System.Management.Automation.RemoteException
## Session Recording ╞Æ?" SessionRecorder
System.Management.Automation.RemoteException
```typescript
class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
  constructor(config: SessionRecorderConfig<TEventMap, TCommandMap, TDebug>);
  readonly sessionId: string;
  readonly tickCount: number;
  readonly markerCount: number;
  readonly snapshotCount: number;
  readonly isConnected: boolean;
  readonly isClosed: boolean;
  readonly lastError: SessionRecordingError | null;
  connect(): void;
  disconnect(): void;
  addMarker(marker: NewMarker): string;
  attach(blob: { mime: string; data: Uint8Array }, options?: { sidecar?: boolean }): string;
  takeSnapshot(): SessionSnapshotEntry;
  toBundle(): SessionBundle<TEventMap, TCommandMap, TDebug>;
}
System.Management.Automation.RemoteException
interface SessionRecorderConfig {
  world: World;
  sink?: SessionSink & SessionSource;       // default: new MemorySink()
  snapshotInterval?: number | null;          // default: 1000; null disables periodic
  terminalSnapshot?: boolean;                // default: true
  debug?: { capture(): TDebug | null };
  sourceLabel?: string;
  sourceKind?: 'session' | 'scenario' | 'synthetic';  // default: 'session'. Added in v0.8.0; set by harnesses (e.g., runSynthPlaytest passes 'synthetic'). See ADR 20a.
  policySeed?: number;                        // populated when sourceKind === 'synthetic'. Added in v0.8.0.
}
System.Management.Automation.RemoteException
type NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance' | 'tick'> & { tick?: number };
```
System.Management.Automation.RemoteException
`connect()` rejects: poisoned world (`code: 'world_poisoned'`); already-attached payload-capturing recorder (`code: 'recorder_already_attached'`); post-disconnect (`code: 'already_closed'`).
System.Management.Automation.RemoteException
`addMarker(input)` validates per spec A6.1: live-tick `EntityRef`s match via `world.isCurrent`; cells in-bounds; tickRange well-formed; attachment ids registered via `attach()` first. Retroactive markers (tick < world.tick) skip entity liveness and are stamped `validated: false`. All recorder-added markers get `provenance: 'game'`.
System.Management.Automation.RemoteException
`attach(blob, options)` defaults to "no preference; each sink applies its own default policy" ╞Æ?" `MemorySink` routes under-threshold attachments to `dataUrl` and oversize to sidecar (with `allowSidecar`); `FileSink` keeps every blob as a sidecar file. Pass `options.sidecar: true` to force sidecar regardless of sink, or `options.sidecar: false` to force `dataUrl` embedding.
System.Management.Automation.RemoteException
## Session Recording ╞Æ?" SessionReplayer
System.Management.Automation.RemoteException
```typescript
class SessionReplayer<TEventMap, TCommandMap, TDebug> {
  static fromBundle(bundle: SessionBundle, config: ReplayerConfig): SessionReplayer;
  static fromSource(source: SessionSource, config: ReplayerConfig): SessionReplayer;
  readonly metadata: SessionMetadata;
  readonly markerCount: number;
  markers(): Marker[];
  markersAt(tick: number): Marker[];
  markersOfKind(kind: MarkerKind): Marker[];
  markersByEntity(ref: EntityRef): Marker[];   // exact id+generation match
  markersByEntityId(id: number): Marker[];     // any generation
  snapshotTicks(): number[];
  ticks(): number[];
  openAt(tick: number): World;
  stateAtTick(tick: number): WorldSnapshot;
  tickEntriesBetween(fromTick: number, toTick: number): SessionTickEntry[];  // inclusive both ends
  selfCheck(options?: SelfCheckOptions): SelfCheckResult;
  validateMarkers(): MarkerValidationResult;
}
System.Management.Automation.RemoteException
interface ReplayerConfig {
  worldFactory: (snapshot: WorldSnapshot) => World;  // part of determinism contract per ADR 4
}
System.Management.Automation.RemoteException
interface SelfCheckOptions {
  stopOnFirstDivergence?: boolean;   // default false
  checkState?: boolean;              // default true
  checkEvents?: boolean;             // default true
  checkExecutions?: boolean;         // default true
}
System.Management.Automation.RemoteException
interface SelfCheckResult {
  ok: boolean;
  checkedSegments: number;
  stateDivergences: StateDivergence[];
  eventDivergences: EventDivergence[];
  executionDivergences: ExecutionDivergence[];
  skippedSegments: SkippedSegment[];      // segments containing failedTicks
}
System.Management.Automation.RemoteException
function deepEqualWithPath(a: unknown, b: unknown, path?: string): { equal: boolean; firstDifferingPath?: string };
```
System.Management.Automation.RemoteException
Range checks per spec A9.1: `< startTick` or `> endTick` (or `> persistedEndTick` for incomplete bundles) throws `BundleRangeError`. `tick` at-or-after first `failedTicks` throws `BundleIntegrityError(code: 'replay_across_failure')`. Replay forward without payloads throws `BundleIntegrityError(code: 'no_replay_payloads')`. Missing handler in factory throws `ReplayHandlerMissingError`. Engine version cross-`b` throws `BundleVersionError`; within-`b` warns. Cross-Node-major warns.
System.Management.Automation.RemoteException
`selfCheck` walks consecutive snapshot pairs (initial + periodic + terminal). 3-stream comparison: state via `deepEqualWithPath`, events ordered structural equality, executions ordered structural equality (excluding `submissionSequence` which resets per segment until snapshot v6 lands). Failure spans skipped.
System.Management.Automation.RemoteException
## Session Recording ╞Æ?" scenarioResultToBundle
System.Management.Automation.RemoteException
```typescript
function scenarioResultToBundle(
  result: ScenarioResult,
  options?: ScenarioResultToBundleOptions,
): SessionBundle;
System.Management.Automation.RemoteException
interface ScenarioResultToBundleOptions {
  sourceLabel?: string;       // default: result.name
  nodeVersion?: string;        // default: process.version
}
```
System.Management.Automation.RemoteException
Translates `runScenario` output to a `SessionBundle` with `sourceKind: 'scenario'`. One `kind: 'assertion'` marker per `result.checks` outcome with `provenance: 'engine'`. `metadata.startTick` from `result.history.initialSnapshot.tick` (NOT hardcoded 0). Throws `BundleIntegrityError(code: 'no_initial_snapshot')` when scenario was configured with `captureInitialSnapshot: false`. Replayable bundle requires `runScenario({ history: { captureCommandPayloads: true } })`; otherwise `bundle.commands` is empty and replay refuses with `BundleIntegrityError(code: 'no_replay_payloads')`.
System.Management.Automation.RemoteException
## Synthetic Playtest ╞Æ?" Policies (v0.7.20)
System.Management.Automation.RemoteException
The synthetic playtest harness drives a `World` via pluggable `Policy` functions for `N` ticks, producing a `SessionBundle` for AI-first feedback loops (Tier 1 of `docs/design/ai-first-dev-roadmap.md`). T1 ships the policy types and three built-in factories. The end-to-end harness `runSynthPlaytest` ships in v0.8.0 (T2).
System.Management.Automation.RemoteException
```typescript
import type { World, ComponentRegistry } from 'civ-engine';
System.Management.Automation.RemoteException
interface PolicyContext<TEventMap, TCommandMap, TComponents = Record<string, unknown>, TState = Record<string, unknown>> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;       // The tick about to execute (commands submitted now run during this tick).
  readonly random: () => number;  // Seeded sub-RNG independent of world.rng. Use this, NOT world.random().
}
System.Management.Automation.RemoteException
interface StopContext<TEventMap, TCommandMap, TComponents, TState> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;       // The tick that just executed (post-step world.tick).
  readonly random: () => number;
}
System.Management.Automation.RemoteException
type PolicyCommand<TCommandMap> = {
  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];
System.Management.Automation.RemoteException
type Policy<TEventMap, TCommandMap, TComponents, TState> = (
  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
) => PolicyCommand<TCommandMap>[];
```
System.Management.Automation.RemoteException
**Determinism contract:** Policies are external coordinators per spec A11.1 clause 2. They MUST be deterministic given their inputs (`world` state, `tick`, `random()`). Any randomness MUST flow through `ctx.random()` ╞Æ?" `Math.random()`, `world.random()`, `Date.now()`, `process.env`, and other non-deterministic sources are forbidden. Policies MUST NOT mutate the world directly; mutation goes through the returned `PolicyCommand[]` which the harness submits via `world.submitWithResult`. `SessionReplayer.selfCheck` is the verification mechanism for non-poisoned bundles.
System.Management.Automation.RemoteException
### `noopPolicy()`
System.Management.Automation.RemoteException
```typescript
function noopPolicy<TEventMap, TCommandMap, TComponents, TState>(): Policy<TEventMap, TCommandMap, TComponents, TState>;
```
System.Management.Automation.RemoteException
Submits nothing. Useful for letting world systems advance without external input.
System.Management.Automation.RemoteException
### `randomPolicy(config)`
System.Management.Automation.RemoteException
```typescript
interface RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState> {
  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
  frequency?: number;  // default 1
  offset?: number;     // default 0; must be < frequency
  burst?: number;      // default 1
}
System.Management.Automation.RemoteException
function randomPolicy<TEventMap, TCommandMap, TComponents, TState>(
  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
): Policy<TEventMap, TCommandMap, TComponents, TState>;
```
System.Management.Automation.RemoteException
Picks a random catalog entry per emit via `ctx.random()`. Emits on ticks where `tick % frequency === offset`. `burst` controls commands per fired tick. Catalog functions receive `PolicyContext` so they can reference live world state. Throws `RangeError` for empty catalog, non-positive-integer frequency/burst, or out-of-range offset.
System.Management.Automation.RemoteException
### `scriptedPolicy(sequence)`
System.Management.Automation.RemoteException
```typescript
type ScriptedPolicyEntry<TCommandMap> = {
  [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];
System.Management.Automation.RemoteException
function scriptedPolicy<TEventMap, TCommandMap, TComponents, TState>(
  sequence: ScriptedPolicyEntry<TCommandMap>[],
): Policy<TEventMap, TCommandMap, TComponents, TState>;
```
System.Management.Automation.RemoteException
Plays back a pre-recorded list of `{ tick, type, data }` entries. Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the sequence emit nothing. `entry.tick` is matched against `PolicyContext.tick` (the tick about to execute), NOT `world.tick` at submit time. **Bundle ╞Æ+' script conversion** (e.g., for regression playback of a recorded bug): bundle `RecordedCommand.submissionTick` is one less than the executing tick, so:
System.Management.Automation.RemoteException
```typescript
const sequence = bundle.commands.map((cmd) => ({
  tick: cmd.submissionTick + 1,
  type: cmd.type,
  data: cmd.data,
}));
```
System.Management.Automation.RemoteException
## Synthetic Playtest ╞Æ?" Harness (v0.8.0)
System.Management.Automation.RemoteException
`runSynthPlaytest` drives a `World` via pluggable policies for `N` ticks and produces a `SessionBundle`. T2 of Spec 3.
System.Management.Automation.RemoteException
### `runSynthPlaytest(config)`
System.Management.Automation.RemoteException
```typescript
function runSynthPlaytest<TEventMap, TCommandMap, TComponents, TState, TDebug = JsonValue>(
  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState>,
): SynthPlaytestResult<TEventMap, TCommandMap, TDebug>;
```
System.Management.Automation.RemoteException
Lifecycle (per spec v10 A7.1):
1. **Validate** `maxTicks >= 1`, `policySeed` is finite integer.
2. **Init sub-RNG** from `policySeed` (default: `Math.floor(world.random() * 0x1_0000_0000)`). Happens BEFORE `recorder.connect()` so the initial snapshot captures post-derivation `world.rng` state.
3. **Attach** `SessionRecorder` with `sourceKind: 'synthetic'` and `terminalSnapshot: true` hardcoded. If `recorder.lastError` is set after `connect()` (sink open failure), re-throw ╞Æ?" no coherent bundle to return.
4. **Tick loop**: per tick, build `policyCtx`, call each policy in array order, submit returned commands via `world.submitWithResult`, call `world.step()`, check `recorder.lastError`, increment `ticksRun`, evaluate `stopWhen` with a fresh `StopContext`. Stop conditions: `maxTicks`, `stopWhen`, `poisoned`, `policyError`, `sinkError` (mid-tick).
5. **Disconnect** + return `{ bundle, ticksRun, stopReason, ok, policyError? }`.
System.Management.Automation.RemoteException
`ok` is `true` for `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError'` (bundle is valid up to the failure point); `false` for `'sinkError'`. **Edge case:** `ok` also flips to `false` if a sink failure occurs during `disconnect()` (e.g., the terminal-snapshot write throws). In that case `stopReason` reports the original loop-exit reason but `recorder.lastError !== null`. CI guards should check `result.ok` rather than just `stopReason !== 'sinkError'`.
System.Management.Automation.RemoteException
### `SynthPlaytestConfig`
System.Management.Automation.RemoteException
```typescript
interface SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState> {
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
  maxTicks: number;                    // required, >= 1
  sink?: SessionSink & SessionSource;  // default: new MemorySink()
  sourceLabel?: string;                 // default: 'synthetic'
  policySeed?: number;                  // default: derived from world.random() at construction
  stopWhen?: (ctx: StopContext<...>) => boolean;
  snapshotInterval?: number | null;    // default 1000; null disables periodic snapshots
}
```
System.Management.Automation.RemoteException
`terminalSnapshot` is intentionally NOT exposed ╞Æ?" the harness always passes `terminalSnapshot: true` to `SessionRecorder` so every bundle has the `(initial, terminal)` segment for `selfCheck`.
System.Management.Automation.RemoteException
### `SynthPlaytestResult`
System.Management.Automation.RemoteException
```typescript
interface SynthPlaytestResult<TEventMap, TCommandMap, TDebug = JsonValue> {
  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
  ticksRun: number;
  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
  ok: boolean;
  policyError?: { policyIndex: number; tick: number; error: { name; message; stack } };
}
```
System.Management.Automation.RemoteException
`ticksRun` = count of `world.step()` invocations that completed AND were followed by a clean `recorder.lastError` check. With `K = world.tick - startTick`:
System.Management.Automation.RemoteException
| stopReason | ticksRun |
|---|---|
| `'maxTicks'`, `'stopWhen'`, `'policyError'` | `K` |
| `'poisoned'`, `'sinkError'` (mid-tick) | `K - 1` |
System.Management.Automation.RemoteException
`policyError` is populated only when `stopReason === 'policyError'`. `bundle.failures` is NOT modified for policy throws ╞Æ?" `failedTicks` is reserved for world-level tick failures.
System.Management.Automation.RemoteException
### Determinism ╞Æ?" CI guard pattern
System.Management.Automation.RemoteException
`SessionReplayer.selfCheck()` is meaningful for non-poisoned synthetic bundles where `ticksRun >= 1`. For `stopReason === 'poisoned'` bundles, `selfCheck()` re-throws the original tick failure (the failed-tick-bounded final segment is replayed). For `ticksRun === 0`, the terminal snapshot equals the initial ╞Æ+' `selfCheck()` returns `ok:true` vacuously.
System.Management.Automation.RemoteException
```typescript
if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
  expect(replayer.selfCheck().ok).toBe(true);
}
```
System.Management.Automation.RemoteException
### Updated existing surface
System.Management.Automation.RemoteException
- `SessionMetadata.sourceKind` widened to `'session' | 'scenario' | 'synthetic'`. **Breaking** for downstream `assertNever` exhaustive switches (b-bump in 0.8.0).
- `SessionMetadata.policySeed?: number` added. Populated when `sourceKind === 'synthetic'`.
- `SessionRecorderConfig.sourceKind?: 'session' | 'scenario' | 'synthetic'` added (default `'session'`).
- `SessionRecorderConfig.policySeed?: number` added.
System.Management.Automation.RemoteException
## Behavioral Metrics (v0.8.2)
System.Management.Automation.RemoteException
A pure-function corpus reducer over `Iterable<SessionBundle>`. Computes built-in + user-defined metrics; compares baseline vs. current. Tier-2 of the AI-first feedback loop (Spec 8).
System.Management.Automation.RemoteException
### `Metric<TState, TResult>`
System.Management.Automation.RemoteException
```typescript
interface Metric<TState, TResult> {
  readonly name: string;             // unique within a runMetrics call
  create(): TState;                  // initial accumulator state
  observe(state: TState, bundle: SessionBundle): TState;  // pure (output depends only on inputs); in-place mutation OK
  finalize(state: TState): TResult;
  merge?(a: TState, b: TState): TState;  // optional; reserved for v2 parallel processing
  readonly orderSensitive?: boolean; // doc-only; runMetrics does NOT auto-detect
}
```
System.Management.Automation.RemoteException
### `Stats`
System.Management.Automation.RemoteException
```typescript
interface Stats {
  count: number;
  min: number | null;   // null when count === 0 (JSON-stable; NaN would not be)
  max: number | null;
  mean: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}
```
System.Management.Automation.RemoteException
Percentile method: NumPy linear (R-quantile type 7). For `count === 1`, all percentiles equal the single value. For `count === 0`, all numeric fields are `null`.
System.Management.Automation.RemoteException
### `runMetrics(bundles, metrics)`
System.Management.Automation.RemoteException
```typescript
function runMetrics<TEventMap, TCommandMap, TDebug = JsonValue>(
  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
  metrics: Metric<unknown, unknown>[],
): MetricsResult;
```
System.Management.Automation.RemoteException
Single-pass-multiplexed reducer. Iterates `bundles` once; for each bundle, calls every metric's `observe`. Throws `RangeError` on duplicate metric names. The iterable is consumed once ╞Æ?" generators get exhausted. `MetricsResult` is `Record<string, unknown>`; per-metric narrowing happens at the consumption site via type assertion.
System.Management.Automation.RemoteException
### Built-in metrics
System.Management.Automation.RemoteException
11 engine-generic metric factories that read only fields the engine guarantees on `SessionBundle`:
System.Management.Automation.RemoteException
| Factory | Reads | Result | Notes |
|---|---|---|---|
| `bundleCount()` | (counter) | `number` | total bundles |
| `sessionLengthStats()` | `metadata.durationTicks` | `Stats` | per-bundle session lengths |
| `commandRateStats()` | `commands.length / durationTicks` | `Stats` | counts SUBMISSIONS (rejected included) |
| `eventRateStats()` | `sum(ticks[].events.length) / durationTicks` | `Stats` | |
| `commandTypeCounts()` | `commands[].type` | `Record<string, number>` | counts SUBMISSIONS by type |
| `eventTypeCounts()` | `ticks[].events[].type` | `Record<string, number>` | |
| `failureBundleRate()` | `metadata.failedTicks?.length > 0` | `number` (ratio) | bundles with any tick failure |
| `failedTickRate()` | `sum(failedTicks) / sum(durationTicks)` | `number` (ratio) | |
| `incompleteBundleRate()` | `metadata.incomplete === true` | `number` (ratio) | recorder-terminated bundles |
| `commandValidationAcceptanceRate()` | `commands[].result.accepted` | `number` (ratio) | submission-stage validator-gate signal |
| `executionFailureRate()` | `executions[].executed === false` | `number` (ratio) | execution-stage handler-failure signal |
System.Management.Automation.RemoteException
`commandValidationAcceptanceRate` and `executionFailureRate` read different bundle sources by design: validator-rejected commands appear in `bundle.commands[].result.accepted=false` but NEVER in `bundle.executions` (validators short-circuit before queueing). The two metrics together cover both regression types.
System.Management.Automation.RemoteException
### `compareMetricsResults(baseline, current)`
System.Management.Automation.RemoteException
```typescript
type NumericDelta = { baseline: number | null; current: number | null; delta: number | null; pctChange: number | null };
type OpaqueDelta = { baseline: unknown; current: unknown; equal: boolean };
type OnlyInComparison = { baseline?: unknown; current?: unknown; onlyIn: 'baseline' | 'current' };
type MetricDelta = NumericDelta | OpaqueDelta | { [key: string]: MetricDelta | OnlyInComparison };
type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;
System.Management.Automation.RemoteException
function compareMetricsResults(baseline: MetricsResult, current: MetricsResult): MetricsComparison;
```
System.Management.Automation.RemoteException
Pure delta computation, no regression judgment. Numeric leaves get `delta` and `pctChange`; non-numeric leaves get `equal: deepEqual(a, b)`. Recurses through nested records (e.g., `commandTypeCounts: Record<string, number>` reports per-key only-in-side at the inner level too). `pctChange` conventions: `0/0 ╞Æ+' 0`, `nonzero/0 ╞Æ+' A├▒Infinity`, `null` inputs propagate to `null` deltas. Arrays are opaque (no per-element diff in v1).
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:21:06.936915Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:21:06.943050Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
I have enough repo context to start the actual plan audit. IΓÇÖm pulling line-numbered views of the proposed implementation plan and a few current APIs next, because there are already hints of contract mismatches between the planΓÇÖs snippets and the existing session-recording types.
2026-04-28T01:21:16.061994Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-design.md | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }'` rejected: blocked by policy
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-design.md | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }'` rejected: blocked by policy
2026-04-28T01:21:16.062155Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-design.md | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem docs\\design | Select-Object -ExpandProperty Name" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 437ms:
2026-04-26-session-recording-and-replay-design.md
2026-04-27-behavioral-metrics-design.md
2026-04-27-behavioral-metrics-implementation-plan.md
2026-04-27-bundle-corpus-index-design.md
2026-04-27-bundle-corpus-index-implementation-plan.md
2026-04-27-session-recording-implementation-plan.md
2026-04-27-synthetic-playtest-harness-design.md
2026-04-27-synthetic-playtest-implementation-plan.md
ai-first-dev-roadmap.md
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:21:16.892372Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:21:16.893005Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:21:24.441621Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "cmd /c findstr /n \".*\" docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "cmd /c findstr /n \".*\" docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md" in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "cmd /c findstr /n \".*\" docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md"` rejected: blocked by policy
2026-04-28T01:21:24.443450Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "cmd /c findstr /n \".*\" docs\\design\\2026-04-27-bundle-corpus-index-design.md"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "cmd /c findstr /n \".*\" docs\\design\\2026-04-27-bundle-corpus-index-design.md" in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "cmd /c findstr /n \".*\" docs\\design\\2026-04-27-bundle-corpus-index-design.md"` rejected: blocked by policy
2026-04-28T01:21:24.694510Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:21:24.695162Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern '.'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-design.md -Pattern '.'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 715ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1:# Bundle Corpus Index Implementation Plan
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:3:> **For agentic workers:** REQUIRED SUB-SKILL: Use 
superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan 
task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:5:**Plan revision:** v1 (2026-04-27) - follows 
accepted Spec 7 design v4 in `docs/design/2026-04-27-bundle-corpus-index-design.md` after four design-review 
iterations.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:7:**Goal:** Implement Spec 7: Bundle Search / Corpus 
Index as a disk-backed manifest-first `BundleCorpus` that indexes closed FileSink bundle directories, filters metadata 
without loading content streams, and yields `SessionBundle`s lazily for `runMetrics`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:9:**Architecture:** Add one focused module, 
`src/bundle-corpus.ts`, that owns filesystem discovery, manifest validation, immutable entry construction, query 
validation/filtering, and FileSink-backed bundle/source loading. The new module composes with existing session 
recording, FileSink, SessionReplayer, and behavioral metrics without changing their signatures.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:11:**Tech Stack:** TypeScript 5.7+, Node 
`fs`/`path`, Vitest 3, ESLint 9, ESM + Node16 module resolution.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:13:**Branch:** None. Commit directly to `main` after 
plan review, implementation, full gates, staged multi-CLI code review, and final doc updates.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:15:**Versioning:** Base is v0.8.2. Spec 7 is 
additive and non-breaking, so ship v0.8.3 with one coherent commit.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:17:---
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:19:## File Map
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:21:- Create `src/bundle-corpus.ts`: public corpus 
API, query helpers, manifest validation, error class, immutable entries, FileSink integration.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:22:- Modify `src/index.ts`: export the Spec 7 public 
surface.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:23:- Create `tests/bundle-corpus.test.ts`: 
FileSink-backed corpus tests plus focused malformed-manifest and malformed-stream cases.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:24:- Modify `package.json`: bump `"version"` from 
`0.8.2` to `0.8.3`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:25:- Modify `src/version.ts`: bump `ENGINE_VERSION` 
from `'0.8.2'` to `'0.8.3'`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:26:- Modify `README.md`: version badge, Feature 
Overview row, Public Surface bullet.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:27:- Modify `docs/api-reference.md`: add `Bundle 
Corpus Index (v0.8.3)` public API section.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:28:- Create `docs/guides/bundle-corpus-index.md`: 
quickstart, query guide, metrics integration, replay investigation, scan depth, closed-corpus and sidecar boundaries.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:29:- Modify `docs/guides/behavioral-metrics.md`: add 
disk-backed `BundleCorpus` example.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:30:- Modify `docs/guides/session-recording.md`: add 
FileSink bundle indexing note.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:31:- Modify `docs/guides/ai-integration.md`: add 
Tier-2 corpus query surface.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:32:- Modify `docs/guides/concepts.md`: add 
`BundleCorpus` to standalone utilities.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:33:- Modify `docs/README.md`: add guide index entry.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:34:- Modify `docs/architecture/ARCHITECTURE.md`: 
Component Map row and boundary note for Bundle Corpus.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:35:- Modify `docs/architecture/drift-log.md`: append 
Spec 7 drift row.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:36:- Modify `docs/architecture/decisions.md`: append 
ADRs 28-31 from the accepted design.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:37:- Modify `docs/design/ai-first-dev-roadmap.md`: 
mark Spec 7 implemented.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:38:- Modify `docs/changelog.md`: add v0.8.3 entry.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:39:- Modify `docs/devlog/summary.md`: add one 
newest-first Spec 7 line and keep the summary compact.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:40:- Modify 
`docs/devlog/detailed/2026-04-27_2026-04-27.md`: append the final task entry after code review artifacts exist.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:41:- Create 
`docs/reviews/bundle-corpus-index-T1/2026-04-27/<iteration>/`: staged-diff code-review artifacts.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:43:## Single Task: Spec 7 - Full Surface, Tests, 
Docs, Review, Commit
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:45:**Goal:** Land the entire Spec 7 surface in one 
v0.8.3 commit: tests, implementation, exports, docs, roadmap status, changelog/devlog, version bump, doc audit, gates, 
and staged multi-CLI code review.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:47:**Files:**
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:48:- Create: `tests/bundle-corpus.test.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:49:- Create: `src/bundle-corpus.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:50:- Modify: `src/index.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:51:- Modify: docs and version files listed in File 
Map
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:53:### Step 1: Write failing corpus tests first
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:55:- [ ] Create `tests/bundle-corpus.test.ts` with 
FileSink-backed fixtures. Use canonical UTC `recordedAt` values because corpus construction validates UTC-Z strings.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:57:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:58:import { mkdtempSync, rmSync, writeFileSync, 
mkdirSync, symlinkSync } from 'node:fs';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:59:import { join } from 'node:path';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:60:import { tmpdir } from 'node:os';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:61:import { afterEach, describe, expect, it } from 
'vitest';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:62:import {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:63:  BundleCorpus,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:64:  CorpusIndexError,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:65:  FileSink,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:66:  SessionRecordingError,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:67:  bundleCount,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:68:  runMetrics,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:69:  type AttachmentDescriptor,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:70:  type SessionMetadata,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:71:  type SessionSnapshotEntry,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:72:} from '../src/index.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:74:const roots: string[] = [];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:76:function tempRoot(): string {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:77:  const root = mkdtempSync(join(tmpdir(), 
'civ-engine-corpus-'));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:78:  roots.push(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:79:  return root;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:80:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:82:afterEach(() => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:83:  for (const root of roots.splice(0)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:84:    rmSync(root, { recursive: true, force: true 
});
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:85:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:86:});
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:88:function metadata(id: string, overrides: 
Partial<SessionMetadata> = {}): SessionMetadata {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:89:  return {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:90:    sessionId: id,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:91:    engineVersion: '0.8.2',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:92:    nodeVersion: 'v20.0.0',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:93:    recordedAt: '2026-04-27T00:00:00.000Z',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:94:    startTick: 0,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:95:    endTick: 10,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:96:    persistedEndTick: 10,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:97:    durationTicks: 10,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:98:    sourceKind: 'session',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:99:    ...overrides,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:100:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:101:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:103:function snapshot(tick: number): 
SessionSnapshotEntry {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:104:  return {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:105:    tick,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:106:    snapshot: { tick } as never,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:107:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:108:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:110:function writeBundle(dir: string, meta: 
SessionMetadata, attachments: AttachmentDescriptor[] = []): void {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:111:  const sink = new FileSink(dir);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:112:  sink.open(meta);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:113:  sink.writeSnapshot(snapshot(meta.startTick));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:114:  if (meta.persistedEndTick !== meta.startTick) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:115:    
sink.writeSnapshot(snapshot(meta.persistedEndTick));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:116:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:117:  for (const attachment of attachments) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:118:    sink.writeAttachment(attachment, new 
Uint8Array([1, 2, 3]));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:119:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:120:  sink.close();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:121:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:123:function writeInvalidManifest(dir: string, 
manifest: unknown): void {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:124:  mkdirSync(dir, { recursive: true });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:125:  writeFileSync(join(dir, 'manifest.json'), 
JSON.stringify(manifest, null, 2));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:126:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:128:function expectCorpusError(fn: () => unknown, 
code: string): CorpusIndexError {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:129:  try {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:130:    fn();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:131:  } catch (error) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:132:    
expect(error).toBeInstanceOf(CorpusIndexError);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:133:    
expect(error).toBeInstanceOf(SessionRecordingError);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:134:    expect((error as 
CorpusIndexError).details.code).toBe(code);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:135:    return error as CorpusIndexError;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:136:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:137:  throw new Error(`expected CorpusIndexError 
${code}`);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:138:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:139:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:141:- [ ] Add discovery, ordering, and 
immutable-entry tests.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:143:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:144:describe('BundleCorpus discovery and entries', 
() => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:145:  it('indexes a root bundle with key "." and 
freezes entry metadata', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:146:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:147:    writeBundle(root, metadata('root', { 
recordedAt: '2026-04-27T00:00:01.000Z' }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:149:    const corpus = new BundleCorpus(root, { 
scanDepth: 'root' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:150:    const entries = corpus.entries();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:152:    expect(entries.map((entry) => 
entry.key)).toEqual(['.']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:153:    expect(entries[0].dir).toBe(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:154:    
expect(Object.isFrozen(entries[0])).toBe(true);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:155:    
expect(Object.isFrozen(entries[0].metadata)).toBe(true);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:156:    expect(corpus.get('.')).toBe(entries[0]);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:158:    expect(() => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:159:      (entries[0].metadata as 
SessionMetadata).sessionId = 'mutated';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:160:    }).toThrow(TypeError);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:161:    
expect(corpus.entries()[0].metadata.sessionId).toBe('root');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:162:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:164:  it('honors scanDepth and sorts by recordedAt, 
sessionId, then key', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:165:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:166:    writeBundle(join(root, 'b'), metadata('s-2', 
{ recordedAt: '2026-04-27T00:00:02.000Z' }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:167:    writeBundle(join(root, 'a'), metadata('s-1', 
{ recordedAt: '2026-04-27T00:00:02.000Z' }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:168:    writeBundle(join(root, 'nested', 'c'), 
metadata('s-0', { recordedAt: '2026-04-27T00:00:00.000Z' }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:170:    expect(new BundleCorpus(root, { scanDepth: 
'root' }).entries()).toEqual([]);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:171:    expect(new BundleCorpus(root, { scanDepth: 
'children' }).entries().map((entry) => entry.key)).toEqual(['a', 'b']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:172:    expect(new BundleCorpus(root, { scanDepth: 
'all' }).entries().map((entry) => entry.key)).toEqual(['nested/c', 'a', 'b']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:173:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:175:  it('skips symlinked directories when the 
platform permits creating them', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:176:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:177:    const target = join(root, 'target');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:178:    writeBundle(target, metadata('target'));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:179:    try {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:180:      symlinkSync(target, join(root, 'link'), 
'junction');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:181:    } catch {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:182:      return;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:183:    }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:185:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:186:    expect(corpus.entries().map((entry) => 
entry.key)).toEqual(['target']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:187:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:188:});
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:189:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:191:- [ ] Add manifest-only, sidecar, query, 
missing-key, invalid-manifest, FileSink, and metrics tests.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:193:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:194:describe('BundleCorpus query and loading 
contracts', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:195:  it('lists from manifest without reading 
malformed streams until loadBundle', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:196:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:197:    const dir = join(root, 'bad-stream');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:198:    writeBundle(dir, metadata('bad-stream'));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:199:    writeFileSync(join(dir, 'ticks.jsonl'), 
'{"tick":\n{}\n');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:201:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:202:    expect(corpus.entries().map((entry) => 
entry.key)).toEqual(['bad-stream']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:203:    expect(() => 
corpus.loadBundle('bad-stream')).toThrow();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:204:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:206:  it('does not read missing sidecar bytes during 
listing or loadBundle', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:207:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:208:    const dir = join(root, 'sidecar');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:209:    writeBundle(dir, metadata('sidecar'), [
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:210:      { id: 'screen', mime: 'image/png', 
sizeBytes: 3, ref: { sidecar: true } },
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:211:    ]);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:212:    rmSync(join(dir, 'attachments', 
'screen.png'));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:214:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:215:    const entry = corpus.entries({ 
attachmentMime: 'image/png' })[0];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:216:    expect(entry.attachmentCount).toBe(1);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:217:    expect(entry.attachmentBytes).toBe(3);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:218:    
expect(entry.attachmentMimes).toEqual(['image/png']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:219:    
expect(entry.loadBundle().attachments).toHaveLength(1);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:220:    expect(() => 
entry.openSource().readSidecar('screen')).toThrow();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:221:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:223:  it('filters by manifest fields and ANDs query 
fields', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:224:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:225:    writeBundle(join(root, 'seeded'), 
metadata('seeded', {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:226:      recordedAt: '2026-04-27T00:00:01.000Z',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:227:      sourceKind: 'synthetic',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:228:      sourceLabel: 'random',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:229:      policySeed: 42,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:230:      durationTicks: 30,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:231:      endTick: 30,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:232:      persistedEndTick: 30,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:233:    }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:234:    writeBundle(join(root, 'unseeded'), 
metadata('unseeded', {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:235:      recordedAt: '2026-04-27T00:00:02.000Z',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:236:      sourceKind: 'synthetic',
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:237:      durationTicks: 5,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:238:      endTick: 5,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:239:      persistedEndTick: 5,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:240:    }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:242:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:243:    expect(corpus.entries({ sourceKind: 
'synthetic', policySeed: { min: 40, max: 50 } }).map((entry) => entry.key)).toEqual(['seeded']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:244:    expect(corpus.entries({ sourceLabel: 
'random' }).map((entry) => entry.key)).toEqual(['seeded']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:245:    expect(corpus.entries({ durationTicks: { 
min: 10 }, recordedAt: { from: '2026-04-27T00:00:00.000Z', to: '2026-04-27T00:00:01.000Z' } }).map((entry) => 
entry.key)).toEqual(['seeded']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:246:    expect(corpus.entries({ key: /seed/ 
}).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:247:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:249:  it('derives failure counts and 
materializedEndTick from metadata', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:250:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:251:    writeBundle(join(root, 'complete'), 
metadata('complete', { endTick: 20, persistedEndTick: 20, durationTicks: 20 }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:252:    writeBundle(join(root, 'incomplete'), 
metadata('incomplete', {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:253:      incomplete: true,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:254:      endTick: 50,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:255:      persistedEndTick: 25,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:256:      durationTicks: 50,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:257:      failedTicks: [26, 27],
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:258:    }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:260:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:261:    
expect(corpus.get('complete')?.materializedEndTick).toBe(20);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:262:    
expect(corpus.get('incomplete')?.materializedEndTick).toBe(25);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:263:    expect(corpus.entries({ materializedEndTick: 
{ max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:264:    expect(corpus.entries({ endTick: { min: 50 } 
}).map((entry) => entry.key)).toEqual(['incomplete']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:265:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:267:  it('rejects invalid query ranges and 
non-canonical recordedAt bounds', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:268:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:269:    writeBundle(join(root, 'bundle'), 
metadata('bundle'));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:270:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:272:    expectCorpusError(() => corpus.entries({ 
durationTicks: { min: 10, max: 1 } }), 'query_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:273:    expectCorpusError(() => corpus.entries({ 
startTick: { min: 0.5 } }), 'query_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:274:    expectCorpusError(() => corpus.entries({ 
policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:275:    expectCorpusError(() => corpus.entries({ 
recordedAt: { from: '2026-04-27' } }), 'query_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:276:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:278:  it('returns undefined for get and throws 
entry_missing for strict missing-key APIs', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:279:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:280:    writeBundle(join(root, 'bundle'), 
metadata('bundle'));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:281:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:283:    
expect(corpus.get('missing')).toBeUndefined();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:284:    expectCorpusError(() => 
corpus.openSource('missing'), 'entry_missing');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:285:    expectCorpusError(() => 
corpus.loadBundle('missing'), 'entry_missing');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:286:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:288:  it('handles invalid manifests strictly or 
through skipInvalid diagnostics', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:289:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:290:    writeBundle(join(root, 'good'), 
metadata('good'));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:291:    writeInvalidManifest(join(root, 'bad'), {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:292:      schemaVersion: 1,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:293:      metadata: metadata('bad', { recordedAt: 
'2026-04-27T00:00:00-07:00' }),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:294:      attachments: [],
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:295:    });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:297:    expectCorpusError(() => new 
BundleCorpus(root), 'manifest_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:298:    const corpus = new BundleCorpus(root, { 
skipInvalid: true });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:299:    expect(corpus.entries().map((entry) => 
entry.key)).toEqual(['good']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:300:    
expect(corpus.invalidEntries).toHaveLength(1);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:301:    
expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:302:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:304:  it('loads FileSink bundles lazily and composes 
with runMetrics', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:305:    const root = tempRoot();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:306:    writeBundle(join(root, 'one'), 
metadata('one', { recordedAt: '2026-04-27T00:00:01.000Z' }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:307:    writeBundle(join(root, 'two'), 
metadata('two', { recordedAt: '2026-04-27T00:00:02.000Z', sourceKind: 'synthetic' }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:309:    const corpus = new BundleCorpus(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:310:    
expect(corpus.openSource('one').readSnapshot(0)).toEqual(snapshot(0).snapshot);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:311:    expect(corpus.loadBundle('one')).toEqual(new 
FileSink(join(root, 'one')).toBundle());
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:312:    expect([...corpus].map((bundle) => 
bundle.metadata.sessionId)).toEqual(['one', 'two']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:313:    expect(runMetrics(corpus.bundles({ 
sourceKind: 'synthetic' }), [bundleCount()]).bundleCount).toBe(1);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:314:  });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:315:});
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:316:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:318:- [ ] Run: `npx vitest run 
tests/bundle-corpus.test.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:319:- [ ] Expected: FAIL with module/export errors 
for `BundleCorpus` and `CorpusIndexError`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:321:### Step 2: Implement `src/bundle-corpus.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:323:- [ ] Create `src/bundle-corpus.ts` with the 
public API and helpers below. Keep the module self-contained; do not modify FileSink, SessionSource, SessionBundle, 
SessionReplayer, or runMetrics.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:325:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:326:import { existsSync, lstatSync, readdirSync, 
readFileSync, realpathSync } from 'node:fs';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:327:import { join, relative, resolve, sep } from 
'node:path';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:328:import type { JsonValue } from './json.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:329:import type { AttachmentDescriptor, 
SessionBundle, SessionMetadata } from './session-bundle.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:330:import { SESSION_BUNDLE_SCHEMA_VERSION } from 
'./session-bundle.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:331:import { SessionRecordingError } from 
'./session-errors.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:332:import { FileSink } from 
'./session-file-sink.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:333:import type { SessionSource } from 
'./session-sink.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:335:const MANIFEST_FILE = 'manifest.json';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:337:export type BundleCorpusScanDepth = 'root' | 
'children' | 'all';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:339:export interface BundleCorpusOptions {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:340:  scanDepth?: BundleCorpusScanDepth;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:341:  skipInvalid?: boolean;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:342:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:344:export interface NumberRange {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:345:  min?: number;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:346:  max?: number;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:347:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:349:export interface IsoTimeRange {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:350:  from?: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:351:  to?: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:352:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:354:type OneOrMany<T> = T | readonly T[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:356:export interface BundleQuery {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:357:  key?: string | RegExp;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:358:  sessionId?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:359:  sourceKind?: 
OneOrMany<SessionMetadata['sourceKind']>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:360:  sourceLabel?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:361:  engineVersion?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:362:  nodeVersion?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:363:  incomplete?: boolean;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:364:  durationTicks?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:365:  startTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:366:  endTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:367:  persistedEndTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:368:  materializedEndTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:369:  failedTickCount?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:370:  policySeed?: number | NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:371:  recordedAt?: IsoTimeRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:372:  attachmentMime?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:373:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:375:export type CorpusIndexErrorCode =
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:376:  | 'root_missing'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:377:  | 'manifest_parse'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:378:  | 'manifest_invalid'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:379:  | 'schema_unsupported'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:380:  | 'duplicate_key'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:381:  | 'query_invalid'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:382:  | 'entry_missing';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:384:export interface CorpusIndexErrorDetails {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:385:  readonly [key: string]: JsonValue;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:386:  readonly code: CorpusIndexErrorCode;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:387:  readonly path?: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:388:  readonly key?: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:389:  readonly message?: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:390:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:392:export class CorpusIndexError extends 
SessionRecordingError {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:393:  override readonly details: 
CorpusIndexErrorDetails;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:395:  constructor(message: string, details: 
CorpusIndexErrorDetails) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:396:    super(message, details);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:397:    this.name = 'CorpusIndexError';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:398:    this.details = details;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:399:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:400:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:402:export interface InvalidCorpusEntry {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:403:  readonly path: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:404:  readonly error: CorpusIndexError;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:405:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:407:export interface BundleCorpusEntry {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:408:  readonly key: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:409:  readonly dir: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:410:  readonly schemaVersion: typeof 
SESSION_BUNDLE_SCHEMA_VERSION;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:411:  readonly metadata: Readonly<SessionMetadata>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:412:  readonly attachmentCount: number;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:413:  readonly attachmentBytes: number;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:414:  readonly attachmentMimes: readonly string[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:415:  readonly hasFailures: boolean;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:416:  readonly failedTickCount: number;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:417:  readonly materializedEndTick: number;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:418:  openSource(): SessionSource;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:419:  loadBundle<
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:420:    TEventMap extends Record<keyof TEventMap, 
unknown> = Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:421:    TCommandMap extends Record<keyof 
TCommandMap, unknown> = Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:422:    TDebug = JsonValue,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:423:  >(): SessionBundle<TEventMap, TCommandMap, 
TDebug>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:424:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:425:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:427:- [ ] Add implementation helpers in the same 
file with these exact responsibilities:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:429:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:430:interface FileManifest {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:431:  schemaVersion: typeof 
SESSION_BUNDLE_SCHEMA_VERSION;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:432:  metadata: SessionMetadata;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:433:  attachments: AttachmentDescriptor[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:434:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:436:function corpusError(message: string, details: 
CorpusIndexErrorDetails): CorpusIndexError {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:437:  return new CorpusIndexError(message, details);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:438:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:440:function isRecord(value: unknown): value is 
Record<string, unknown> {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:441:  return typeof value === 'object' && value !== 
null && !Array.isArray(value);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:442:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:444:function assertCanonicalIso(value: unknown, 
label: string, path: string): string {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:445:  if (typeof value !== 'string' || 
!value.endsWith('Z')) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:446:    throw corpusError(`${label} must be a 
normalized UTC ISO string`, { code: 'manifest_invalid', path, message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:447:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:448:  const parsed = new Date(value);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:449:  if (!Number.isFinite(parsed.getTime()) || 
parsed.toISOString() !== value) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:450:    throw corpusError(`${label} must round-trip 
through Date.toISOString()`, { code: 'manifest_invalid', path, message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:451:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:452:  return value;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:453:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:455:function validateQueryIso(value: unknown, label: 
string): string {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:456:  if (typeof value !== 'string' || 
!value.endsWith('Z')) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:457:    throw corpusError(`${label} must be a 
normalized UTC ISO string`, { code: 'query_invalid', message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:458:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:459:  const parsed = new Date(value);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:460:  if (!Number.isFinite(parsed.getTime()) || 
parsed.toISOString() !== value) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:461:    throw corpusError(`${label} must round-trip 
through Date.toISOString()`, { code: 'query_invalid', message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:462:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:463:  return value;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:464:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:466:function assertString(value: unknown, label: 
string, path: string): string {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:467:  if (typeof value !== 'string') {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:468:    throw corpusError(`${label} must be a 
string`, { code: 'manifest_invalid', path, message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:469:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:470:  return value;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:471:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:473:function assertInteger(value: unknown, label: 
string, path: string): number {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:474:  if (typeof value !== 'number' || 
!Number.isFinite(value) || !Number.isInteger(value)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:475:    throw corpusError(`${label} must be a finite 
integer`, { code: 'manifest_invalid', path, message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:476:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:477:  return value;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:478:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:479:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:481:- [ ] Validate manifests with runtime checks 
instead of trusting JSON casts.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:483:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:484:function validateMetadata(value: unknown, path: 
string): SessionMetadata {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:485:  if (!isRecord(value)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:486:    throw corpusError('manifest metadata must be 
an object', { code: 'manifest_invalid', path, message: 'metadata' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:487:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:488:  const sourceKind = value.sourceKind;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:489:  if (sourceKind !== 'session' && sourceKind !== 
'scenario' && sourceKind !== 'synthetic') {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:490:    throw corpusError('metadata.sourceKind must 
be session, scenario, or synthetic', { code: 'manifest_invalid', path, message: 'sourceKind' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:491:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:492:  const failedTicks = value.failedTicks === 
undefined
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:493:    ? undefined
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:494:    : Array.isArray(value.failedTicks)
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:495:      ? value.failedTicks.map((tick, index) => 
assertInteger(tick, `failedTicks[${index}]`, path))
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:496:      : (() => { throw 
corpusError('metadata.failedTicks must be an array', { code: 'manifest_invalid', path, message: 'failedTicks' }); })();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:497:  const metadata: SessionMetadata = {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:498:    sessionId: assertString(value.sessionId, 
'sessionId', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:499:    engineVersion: 
assertString(value.engineVersion, 'engineVersion', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:500:    nodeVersion: assertString(value.nodeVersion, 
'nodeVersion', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:501:    recordedAt: 
assertCanonicalIso(value.recordedAt, 'recordedAt', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:502:    startTick: assertInteger(value.startTick, 
'startTick', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:503:    endTick: assertInteger(value.endTick, 
'endTick', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:504:    persistedEndTick: 
assertInteger(value.persistedEndTick, 'persistedEndTick', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:505:    durationTicks: 
assertInteger(value.durationTicks, 'durationTicks', path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:506:    sourceKind,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:507:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:508:  if (value.sourceLabel !== undefined) 
metadata.sourceLabel = assertString(value.sourceLabel, 'sourceLabel', path);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:509:  if (value.incomplete !== undefined) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:510:    if (value.incomplete !== true) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:511:      throw corpusError('metadata.incomplete 
must be true when present', { code: 'manifest_invalid', path, message: 'incomplete' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:512:    }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:513:    metadata.incomplete = true;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:514:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:515:  if (failedTicks) metadata.failedTicks = 
failedTicks;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:516:  if (value.policySeed !== undefined) 
metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:517:  return metadata;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:518:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:520:function validateAttachment(value: unknown, 
path: string, index: number): AttachmentDescriptor {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:521:  if (!isRecord(value)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:522:    throw corpusError(`attachments[${index}] 
must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}]` });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:523:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:524:  const ref = value.ref;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:525:  if (!isRecord(ref)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:526:    throw corpusError(`attachments[${index}].ref 
must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:527:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:528:  const refKeys = Object.keys(ref).filter((key) 
=> ref[key] !== undefined);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:529:  const validRef =
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:530:    (refKeys.length === 1 && typeof ref.dataUrl 
=== 'string') ||
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:531:    (refKeys.length === 1 && ref.sidecar === 
true) ||
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:532:    (refKeys.length === 1 && ref.auto === true);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:533:  if (!validRef) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:534:    throw corpusError(`attachments[${index}].ref 
must be dataUrl, sidecar, or auto`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:535:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:536:  return {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:537:    id: assertString(value.id, 
`attachments[${index}].id`, path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:538:    mime: assertString(value.mime, 
`attachments[${index}].mime`, path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:539:    sizeBytes: assertInteger(value.sizeBytes, 
`attachments[${index}].sizeBytes`, path),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:540:    ref: ref as AttachmentDescriptor['ref'],
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:541:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:542:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:544:function readManifest(manifestPath: string): 
FileManifest {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:545:  let parsed: unknown;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:546:  try {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:547:    parsed = 
JSON.parse(readFileSync(manifestPath, 'utf-8')) as unknown;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:548:  } catch (error) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:549:    throw corpusError(`manifest parse failed: 
${(error as Error).message}`, { code: 'manifest_parse', path: manifestPath, message: (error as Error).message });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:550:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:551:  if (!isRecord(parsed)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:552:    throw corpusError('manifest must be an 
object', { code: 'manifest_invalid', path: manifestPath, message: 'manifest' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:553:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:554:  if (parsed.schemaVersion !== 
SESSION_BUNDLE_SCHEMA_VERSION) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:555:    throw corpusError('unsupported bundle schema 
version', { code: 'schema_unsupported', path: manifestPath, message: String(parsed.schemaVersion) });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:556:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:557:  if (!Array.isArray(parsed.attachments)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:558:    throw corpusError('manifest attachments must 
be an array', { code: 'manifest_invalid', path: manifestPath, message: 'attachments' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:559:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:560:  return {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:561:    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:562:    metadata: validateMetadata(parsed.metadata, 
manifestPath),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:563:    attachments: 
parsed.attachments.map((attachment, index) => validateAttachment(attachment, manifestPath, index)),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:564:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:565:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:566:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:568:- [ ] Add `BundleCorpus` with synchronous 
construction, deterministic discovery, immutable entries, query filtering, and lazy bundle iteration.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:570:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:571:export class BundleCorpus implements 
Iterable<SessionBundle> {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:572:  readonly rootDir: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:573:  readonly invalidEntries: readonly 
InvalidCorpusEntry[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:574:  private readonly _entries: readonly 
BundleCorpusEntry[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:575:  private readonly _byKey: ReadonlyMap<string, 
BundleCorpusEntry>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:577:  constructor(rootDir: string, options: 
BundleCorpusOptions = {}) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:578:    const root = resolve(rootDir);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:579:    if (!existsSync(root) || 
!lstatSync(root).isDirectory()) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:580:      throw corpusError('corpus root is missing 
or is not a directory', { code: 'root_missing', path: root });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:581:    }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:582:    this.rootDir = realpathSync(root);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:583:    const invalidEntries: InvalidCorpusEntry[] = 
[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:584:    const found = 
discoverBundleDirs(this.rootDir, options.scanDepth ?? 'all');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:585:    const byKey = new Map<string, 
BundleCorpusEntry>();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:586:    const entries: BundleCorpusEntry[] = [];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:588:    for (const dir of found) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:589:      const key = keyForDir(this.rootDir, dir);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:590:      if (byKey.has(key)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:591:        throw corpusError(`duplicate corpus key 
${key}`, { code: 'duplicate_key', path: dir, key });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:592:      }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:593:      try {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:594:        const entry = makeEntry(dir, key, 
readManifest(join(dir, MANIFEST_FILE)));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:595:        byKey.set(key, entry);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:596:        entries.push(entry);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:597:      } catch (error) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:598:        if (options.skipInvalid && error 
instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:599:          invalidEntries.push(Object.freeze({ 
path: join(dir, MANIFEST_FILE), error }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:600:          continue;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:601:        }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:602:        throw error;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:603:      }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:604:    }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:606:    entries.sort(compareEntries);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:607:    this._entries = 
Object.freeze(entries.slice());
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:608:    this._byKey = new Map(entries.map((entry) => 
[entry.key, entry]));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:609:    this.invalidEntries = 
Object.freeze(invalidEntries.slice());
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:610:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:612:  entries(query?: BundleQuery): readonly 
BundleCorpusEntry[] {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:613:    const predicate = query ? 
compileQuery(query) : () => true;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:614:    return 
Object.freeze(this._entries.filter(predicate));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:615:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:617:  *bundles(query?: BundleQuery): 
IterableIterator<SessionBundle> {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:618:    for (const entry of this.entries(query)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:619:      yield entry.loadBundle();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:620:    }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:621:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:623:  get(key: string): BundleCorpusEntry | 
undefined {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:624:    return this._byKey.get(key);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:625:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:627:  openSource(key: string): SessionSource {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:628:    return requireEntry(this._byKey, 
key).openSource();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:629:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:631:  loadBundle<
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:632:    TEventMap extends Record<keyof TEventMap, 
unknown> = Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:633:    TCommandMap extends Record<keyof 
TCommandMap, unknown> = Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:634:    TDebug = JsonValue,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:635:  >(key: string): SessionBundle<TEventMap, 
TCommandMap, TDebug> {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:636:    return requireEntry(this._byKey, 
key).loadBundle<TEventMap, TCommandMap, TDebug>();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:637:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:639:  [Symbol.iterator](): 
IterableIterator<SessionBundle> {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:640:    return this.bundles();
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:641:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:642:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:643:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:645:- [ ] Implement the remaining private helpers 
exactly enough to satisfy the tests and design:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:647:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:648:function discoverBundleDirs(root: string, depth: 
BundleCorpusScanDepth): string[] {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:649:  const out: string[] = [];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:650:  function visit(dir: string, remaining: number 
| 'all'): void {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:651:    if (existsSync(join(dir, MANIFEST_FILE))) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:652:      out.push(dir);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:653:      return;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:654:    }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:655:    if (remaining === 0) return;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:656:    const nextRemaining = remaining === 'all' ? 
'all' : remaining - 1;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:657:    const children = readdirSync(dir, { 
withFileTypes: true })
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:658:      .filter((dirent) => dirent.isDirectory() 
&& !dirent.isSymbolicLink())
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:659:      .map((dirent) => dirent.name)
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:660:      .sort((a, b) => a.localeCompare(b));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:661:    for (const child of children) 
visit(join(dir, child), nextRemaining);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:662:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:663:  visit(root, depth === 'root' ? 0 : depth === 
'children' ? 1 : 'all');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:664:  return out;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:665:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:667:function keyForDir(root: string, dir: string): 
string {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:668:  const rel = relative(root, dir);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:669:  if (rel.length === 0) return '.';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:670:  return rel.split(sep).join('/');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:671:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:673:function makeEntry(dir: string, key: string, 
manifest: FileManifest): BundleCorpusEntry {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:674:  const failedTicks = 
manifest.metadata.failedTicks ? Object.freeze(manifest.metadata.failedTicks.slice()) : undefined;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:675:  const metadata = Object.freeze({ 
...manifest.metadata, ...(failedTicks ? { failedTicks } : {}) });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:676:  const attachmentMimes = Object.freeze([...new 
Set(manifest.attachments.map((attachment) => attachment.mime))].sort((a, b) => a.localeCompare(b)));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:677:  const materializedEndTick = 
metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:678:  const entry: BundleCorpusEntry = {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:679:    key,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:680:    dir,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:681:    schemaVersion: manifest.schemaVersion,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:682:    metadata,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:683:    attachmentCount: manifest.attachments.length,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:684:    attachmentBytes: 
manifest.attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:685:    attachmentMimes,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:686:    hasFailures: (metadata.failedTicks?.length 
?? 0) > 0,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:687:    failedTickCount: 
metadata.failedTicks?.length ?? 0,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:688:    materializedEndTick,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:689:    openSource: () => new FileSink(dir),
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:690:    loadBundle: <
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:691:      TEventMap extends Record<keyof TEventMap, 
unknown> = Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:692:      TCommandMap extends Record<keyof 
TCommandMap, unknown> = Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:693:      TDebug = JsonValue,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:694:    >() => new FileSink(dir).toBundle() as 
SessionBundle<TEventMap, TCommandMap, TDebug>,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:695:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:696:  return Object.freeze(entry);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:697:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:699:function compareEntries(a: BundleCorpusEntry, b: 
BundleCorpusEntry): number {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:700:  return 
a.metadata.recordedAt.localeCompare(b.metadata.recordedAt)
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:701:    || 
a.metadata.sessionId.localeCompare(b.metadata.sessionId)
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:702:    || a.key.localeCompare(b.key);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:703:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:705:function requireEntry(map: ReadonlyMap<string, 
BundleCorpusEntry>, key: string): BundleCorpusEntry {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:706:  const entry = map.get(key);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:707:  if (!entry) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:708:    throw corpusError(`corpus entry ${key} not 
found`, { code: 'entry_missing', key });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:709:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:710:  return entry;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:711:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:712:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:714:- [ ] Implement `compileQuery(query)` with 
inclusive numeric ranges, one-or-many matching, optional-field exclusion, `attachmentMime` any-match, canonical 
`recordedAt` bounds, and AND semantics.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:716:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:717:function asArray<T>(value: OneOrMany<T>): 
readonly T[] {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:718:  return Array.isArray(value) ? value : [value];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:719:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:721:function assertQueryInteger(value: unknown, 
label: string): number {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:722:  if (typeof value !== 'number' || 
!Number.isFinite(value) || !Number.isInteger(value)) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:723:    throw corpusError(`${label} must be a finite 
integer`, { code: 'query_invalid', message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:724:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:725:  return value;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:726:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:728:function assertNumberRange(range: NumberRange, 
label: string): Required<NumberRange> {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:729:  if (range.min !== undefined) 
assertQueryInteger(range.min, `${label}.min`);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:730:  if (range.max !== undefined) 
assertQueryInteger(range.max, `${label}.max`);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:731:  const min = range.min ?? 
Number.NEGATIVE_INFINITY;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:732:  const max = range.max ?? 
Number.POSITIVE_INFINITY;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:733:  if (min > max) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:734:    throw corpusError(`${label}.min must be <= 
max`, { code: 'query_invalid', message: label });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:735:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:736:  return { min, max };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:737:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:739:function matchesRange(value: number, range: 
Required<NumberRange>): boolean {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:740:  return value >= range.min && value <= 
range.max;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:741:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:743:function matchesOne<T>(value: T | undefined, 
expected: OneOrMany<T> | undefined): boolean {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:744:  if (expected === undefined) return true;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:745:  if (value === undefined) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:746:  return asArray(expected).includes(value);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:747:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:749:function compileQuery(query: BundleQuery): 
(entry: BundleCorpusEntry) => boolean {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:750:  const ranges = {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:751:    durationTicks: query.durationTicks ? 
assertNumberRange(query.durationTicks, 'durationTicks') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:752:    startTick: query.startTick ? 
assertNumberRange(query.startTick, 'startTick') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:753:    endTick: query.endTick ? 
assertNumberRange(query.endTick, 'endTick') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:754:    persistedEndTick: query.persistedEndTick ? 
assertNumberRange(query.persistedEndTick, 'persistedEndTick') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:755:    materializedEndTick: 
query.materializedEndTick ? assertNumberRange(query.materializedEndTick, 'materializedEndTick') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:756:    failedTickCount: query.failedTickCount ? 
assertNumberRange(query.failedTickCount, 'failedTickCount') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:757:    policySeed: typeof query.policySeed === 
'object' ? assertNumberRange(query.policySeed, 'policySeed') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:758:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:759:  const policySeedScalar = typeof 
query.policySeed === 'number' ? assertQueryInteger(query.policySeed, 'policySeed') : undefined;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:760:  const recordedAtFrom = query.recordedAt?.from 
=== undefined ? undefined : validateQueryIso(query.recordedAt.from, 'recordedAt.from');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:761:  const recordedAtTo = query.recordedAt?.to === 
undefined ? undefined : validateQueryIso(query.recordedAt.to, 'recordedAt.to');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:762:  if (recordedAtFrom && recordedAtTo && 
recordedAtFrom > recordedAtTo) {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:763:    throw corpusError('recordedAt.from must be 
<= recordedAt.to', { code: 'query_invalid', message: 'recordedAt' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:764:  }
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:766:  return (entry) => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:767:    const m = entry.metadata;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:768:    if (query.key instanceof RegExp ? 
!query.key.test(entry.key) : query.key !== undefined && entry.key !== query.key) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:769:    if (!matchesOne(m.sessionId, 
query.sessionId)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:770:    if (!matchesOne(m.sourceKind, 
query.sourceKind)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:771:    if (!matchesOne(m.sourceLabel, 
query.sourceLabel)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:772:    if (!matchesOne(m.engineVersion, 
query.engineVersion)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:773:    if (!matchesOne(m.nodeVersion, 
query.nodeVersion)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:774:    if (query.incomplete !== undefined && 
(m.incomplete === true) !== query.incomplete) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:775:    if (ranges.durationTicks && 
!matchesRange(m.durationTicks, ranges.durationTicks)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:776:    if (ranges.startTick && 
!matchesRange(m.startTick, ranges.startTick)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:777:    if (ranges.endTick && 
!matchesRange(m.endTick, ranges.endTick)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:778:    if (ranges.persistedEndTick && 
!matchesRange(m.persistedEndTick, ranges.persistedEndTick)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:779:    if (ranges.materializedEndTick && 
!matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:780:    if (ranges.failedTickCount && 
!matchesRange(entry.failedTickCount, ranges.failedTickCount)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:781:    if (policySeedScalar !== undefined && 
m.policySeed !== policySeedScalar) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:782:    if (ranges.policySeed && (m.policySeed === 
undefined || !matchesRange(m.policySeed, ranges.policySeed))) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:783:    if (recordedAtFrom && m.recordedAt < 
recordedAtFrom) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:784:    if (recordedAtTo && m.recordedAt > 
recordedAtTo) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:785:    if (query.attachmentMime && 
!entry.attachmentMimes.some((mime) => asArray(query.attachmentMime!).includes(mime))) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:786:    return true;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:787:  };
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:788:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:789:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:791:- [ ] Run: `npx vitest run 
tests/bundle-corpus.test.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:792:- [ ] Expected: tests compile, then failures 
point to any mismatch between test names and implementation details rather than missing exports.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:794:### Step 3: Export the public surface
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:796:- [ ] Modify `src/index.ts` by adding this 
export block after the FileSink export and before SessionRecorder:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:798:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:799:// Bundle Corpus Index - Spec 7 (v0.8.3+): 
manifest-first query/index layer
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:800:// over closed FileSink bundle directories, with 
lazy SessionBundle loading.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:801:export {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:802:  BundleCorpus,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:803:  CorpusIndexError,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:804:  type BundleCorpusScanDepth,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:805:  type BundleCorpusOptions,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:806:  type BundleCorpusEntry,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:807:  type BundleQuery,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:808:  type NumberRange,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:809:  type IsoTimeRange,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:810:  type CorpusIndexErrorCode,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:811:  type CorpusIndexErrorDetails,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:812:  type InvalidCorpusEntry,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:813:} from './bundle-corpus.js';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:814:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:816:- [ ] Run: `npx vitest run 
tests/bundle-corpus.test.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:817:- [ ] Expected: PASS for the focused corpus test 
file.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:819:### Step 4: Add public documentation and version 
bump
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:821:- [ ] Modify `package.json`:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:823:```json
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:824:{
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:825:  "version": "0.8.3"
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:826:}
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:827:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:829:- [ ] Modify `src/version.ts`:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:831:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:832:export const ENGINE_VERSION = '0.8.3' as const;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:833:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:835:- [ ] Modify README version badge from `0.8.2` 
to `0.8.3`. Add a Feature Overview row for "Bundle Corpus Index" and a Public Surface bullet that names 
`BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, and `CorpusIndexError`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:836:- [ ] Add `docs/guides/bundle-corpus-index.md` 
with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, 
`Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Sidecar Boundary`, `Limitations`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:837:- [ ] In `docs/guides/bundle-corpus-index.md`, 
include this quickstart:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:839:```ts
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:840:import { BundleCorpus, bundleCount, runMetrics, 
sessionLengthStats } from 'civ-engine';
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:842:const corpus = new 
BundleCorpus('artifacts/synth-corpus');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:843:const syntheticComplete = corpus.bundles({ 
sourceKind: 'synthetic', incomplete: false });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:844:const metrics = runMetrics(syntheticComplete, 
[bundleCount(), sessionLengthStats()]);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:845:console.log(metrics);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:846:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:848:- [ ] Modify `docs/api-reference.md` with `## 
Bundle Corpus Index (v0.8.3)` and one subsection for each public type exported in Step 3. Include constructor, 
`entries`, `bundles`, `get`, `openSource`, `loadBundle`, and `[Symbol.iterator]` signatures exactly as accepted in the 
design.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:849:- [ ] Modify `docs/guides/behavioral-metrics.md` 
by adding a disk-backed example using `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:850:- [ ] Modify `docs/guides/session-recording.md` 
by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and 
that callers should build the corpus after sinks close.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:851:- [ ] Modify `docs/guides/ai-integration.md` by 
adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:852:- [ ] Modify `docs/guides/concepts.md` by adding 
`BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:853:- [ ] Modify `docs/README.md` by adding a 
`bundle-corpus-index.md` guide link.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:854:- [ ] Modify `docs/architecture/ARCHITECTURE.md` 
by adding a Component Map row for `src/bundle-corpus.ts` and a Boundaries paragraph that says the subsystem reads 
manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:855:- [ ] Append a row to 
`docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 
unblocks disk-resident corpora for metrics and bundle triage."
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:856:- [ ] Append ADRs 28-31 from 
`docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing 
ADRs.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:857:- [ ] Modify 
`docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed 
bundle listing/filtering for Spec 8.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:858:- [ ] Add a `## 0.8.3 - 2026-04-27` entry at the 
top of `docs/changelog.md` with what shipped, why, validation commands, and behavior callouts for scan depth, 
manifest-only listing, closed corpus, and sidecar bytes.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:860:### Step 5: Run focused validation and doc audit
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:862:- [ ] Run: `npx vitest run 
tests/bundle-corpus.test.ts`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:863:- [ ] Expected: PASS.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:864:- [ ] Run: `npm run typecheck`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:865:- [ ] Expected: PASS with no TypeScript errors.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:866:- [ ] Run: `npm run lint`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:867:- [ ] Expected: PASS with no ESLint errors.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:868:- [ ] Run this doc audit command:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:870:```powershell
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:871:Select-String -Path README.md,docs\README.md,docs
\api-reference.md,docs\guides\*.md,docs\architecture\ARCHITECTURE.md,docs\design\ai-first-dev-roadmap.md -Pattern 
"BundleCorpus|bundle-corpus-index|0.8.3"
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:872:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:874:- [ ] Expected: output includes current README, 
API reference, new guide, guide index, architecture, and roadmap mentions. No stale signatures are found during manual 
inspection of those hits.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:876:### Step 6: Run full engine gates
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:878:- [ ] Run: `npm test`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:879:- [ ] Expected: all tests pass, preserving the 
current baseline of 845 passing tests plus the new bundle-corpus tests and the existing 2 pending tests.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:880:- [ ] Run: `npm run typecheck`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:881:- [ ] Expected: PASS.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:882:- [ ] Run: `npm run lint`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:883:- [ ] Expected: PASS.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:884:- [ ] Run: `npm run build`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:885:- [ ] Expected: PASS and 
`dist/bundle-corpus.d.ts` plus `dist/bundle-corpus.js` are emitted by the build.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:887:### Step 7: Stage the coherent change and run 
multi-CLI code review
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:889:- [ ] Stage only the Spec 7 implementation, 
tests, docs, design/review artifacts, and version files:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:891:```powershell
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:892:git add src\bundle-corpus.ts src\index.ts 
tests\bundle-corpus.test.ts package.json src\version.ts README.md docs\api-reference.md 
docs\guides\bundle-corpus-index.md docs\guides\behavioral-metrics.md docs\guides\session-recording.md 
docs\guides\ai-integration.md docs\guides\concepts.md docs\README.md docs\architecture\ARCHITECTURE.md 
docs\architecture\drift-log.md docs\architecture\decisions.md docs\design\ai-first-dev-roadmap.md 
docs\design\2026-04-27-bundle-corpus-index-design.md docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md 
docs\changelog.md docs\reviews\bundle-corpus-index docs\reviews\bundle-corpus-index-T1
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:893:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:895:- [ ] Create code-review iteration 1 folders:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:897:```powershell
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:898:New-Item -ItemType Directory -Force 
docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:899:git diff --staged | Set-Content -Encoding UTF8 
docs\reviews\bundle-corpus-index-T1\2026-04-27\1\diff.md
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:900:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:902:- [ ] Run two independent Codex reviewers and 
Claude when available. Save raw outputs as `raw/codex.md`, `raw/codex-2.md`, and `raw/opus.md`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:904:```powershell
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:905:$prompt = @'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:906:You are a senior code reviewer for civ-engine 
Spec 7: Bundle Search / Corpus Index. Review the staged diff only. The intent is an additive v0.8.3 API that adds 
BundleCorpus over closed FileSink bundle directories. Verify correctness, design, deterministic ordering, manifest 
validation, query validation, FileSink/runMetrics integration, tests, public exports, docs, version bump, and 
AGENTS.md doc discipline. Verify docs in the diff match implementation; flag stale signatures, removed APIs still 
mentioned, or missing coverage of new APIs in canonical guides. Do NOT modify files. Only return real findings with 
severity, explanation, and suggested fix. If there are no real issues, say ACCEPT.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:907:'@
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:908:$jobs = @()
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:909:$jobs += Start-Job -ScriptBlock { param($prompt) 
git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox 
read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 
docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex.md } -ArgumentList $prompt
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:910:$jobs += Start-Job -ScriptBlock { param($prompt) 
git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox 
read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 
docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex-2.md } -ArgumentList $prompt
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:911:$jobs += Start-Job -ScriptBlock { param($prompt) 
git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $prompt --allowedTools "Read,Bash(git 
diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 
docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\opus.md } -ArgumentList $prompt
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:912:Wait-Job -Job $jobs
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:913:$jobs | Receive-Job
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:914:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:916:- [ ] Synthesize 
`docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md` with provider-by-provider findings, severity, 
accepted/nitpick verdicts, and follow-up actions.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:917:- [ ] If a reviewer reports a real issue, fix 
it, rerun affected tests, rerun full gates if behavior or public docs changed, stage the updated diff, and create 
iteration `2` with the same raw/diff/REVIEW layout. Stop when reviewers accept or only nitpick.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:918:- [ ] If Claude is unreachable because of quota 
or model access, keep `raw/opus.md` with the error text and proceed with the two Codex outputs, documenting the 
unreachable Claude reviewer in `REVIEW.md` and the devlog.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:920:### Step 8: Write final devlog entries after 
code review convergence
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:922:- [ ] Modify 
`docs/devlog/detailed/2026-04-27_2026-04-27.md` with a new timestamped entry for Spec 7. Include action, code reviewer 
comments by provider and theme, result, reasoning, and notes. Mention the final review iteration folder.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:923:- [ ] Modify `docs/devlog/summary.md` with one 
newest-first line: "2026-04-27 - Shipped Spec 7 Bundle Corpus Index in v0.8.3: manifest-first FileSink corpus 
discovery/query plus lazy bundle iteration for runMetrics." Keep the file under 50 compact lines.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:924:- [ ] Stage the devlog files:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:926:```powershell
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:927:git add 
docs\devlog\detailed\2026-04-27_2026-04-27.md docs\devlog\summary.md
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:928:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:930:- [ ] Run: `git diff --cached --stat`
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:931:- [ ] Expected: staged files are only the 
coherent Spec 7 implementation, tests, docs, review artifacts, and version bump.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:933:### Step 9: Final verification and 
direct-to-main commit
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:935:- [ ] Run final gates after the devlog update:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:937:```powershell
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:938:npm test
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:939:npm run typecheck
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:940:npm run lint
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:941:npm run build
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:942:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:944:- [ ] Expected: all four commands pass.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:945:- [ ] Commit directly on `main`:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:947:```powershell
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:948:git commit -m "feat: add bundle corpus index"
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:949:```
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:951:- [ ] Expected: one v0.8.3 commit containing 
code, tests, docs, ADRs, roadmap status, changelog, devlog, review artifacts, and version bump.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:953:## Acceptance Checklist
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:955:- [ ] Public exports include `BundleCorpus`, 
`BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `NumberRange`, `IsoTimeRange`, 
`CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:956:- [ ] Construction discovers root, child, and 
nested FileSink bundle directories according to `scanDepth`; root bundle key is `'.'`; descendant keys use `/`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:957:- [ ] Discovery skips symlinked directories and 
stops descending inside bundle directories.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:958:- [ ] `entries(query?)` reads manifests only and 
returns deterministic frozen entries in `recordedAt`, `sessionId`, `key` order.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:959:- [ ] `bundles(query?)` and `[Symbol.iterator]` 
lazily load full bundles through FileSink.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:960:- [ ] `get` returns `undefined` for missing 
keys; `openSource` and `loadBundle` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:961:- [ ] Query filters cover exact, one-or-many, 
numeric range, ISO range, optional field, failure count, materialized end tick, key RegExp, and attachment MIME 
any-match semantics.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:962:- [ ] Invalid query and invalid manifest errors 
use `CorpusIndexError` with JSON-shaped `details.code`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:963:- [ ] `skipInvalid` records invalid manifests 
and omits them from entries.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:964:- [ ] `runMetrics(corpus.bundles(query), 
metrics)` is covered by tests.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:965:- [ ] Docs, ADRs, roadmap, changelog, devlog, 
API reference, README badge, and version bump ship in the same commit.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:966:- [ ] `npm test`, `npm run typecheck`, `npm run 
lint`, and `npm run build` pass before commit.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:967:- [ ] Multi-CLI code review artifacts exist and 
converge under `docs/reviews/bundle-corpus-index-T1/2026-04-27/`.
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 721ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-design.md:1:# Bundle Search / Corpus Index - Design Spec
docs\design\2026-04-27-bundle-corpus-index-design.md:3:**Status:** Accepted v4 (2026-04-27 project-local date). Fresh 
Codex brainstorm completed before drafting. Design iteration 1 was rejected under 
`docs/reviews/bundle-corpus-index/2026-04-27/design-1/` for contract/API precision issues. Design iteration 2 was 
rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-2/` for the replay-horizon name, root-key encoding, 
attachment MIME query semantics, manifest-embedded attachment caveat, and error-detail shape. Design iteration 3 was 
rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-3/` for missing-key wording on the wrong API 
surface and non-canonical `recordedAt` handling. Design iteration 4 accepted this version under 
`docs/reviews/bundle-corpus-index/2026-04-27/design-4/`.
docs\design\2026-04-27-bundle-corpus-index-design.md:5:**Scope:** Tier-2 spec from 
`docs/design/ai-first-dev-roadmap.md` (Spec 7). Builds on Session Recording / Replay (Spec 1), Synthetic Playtest 
Harness (Spec 3), and Behavioral Metrics over Corpus (Spec 8). v1 provides a disk-backed corpus/index that discovers 
closed FileSink bundle directories, lists and filters them from `manifest.json` metadata, and yields full 
`SessionBundle`s lazily for `runMetrics`.
docs\design\2026-04-27-bundle-corpus-index-design.md:7:**Author:** civ-engine team
docs\design\2026-04-27-bundle-corpus-index-design.md:9:**Related primitives:** `FileSink`, `SessionSource`, 
`SessionBundle`, `SessionMetadata`, `SessionRecordingError`, `runMetrics`, `SessionReplayer`.
docs\design\2026-04-27-bundle-corpus-index-design.md:11:## 1. Goals
docs\design\2026-04-27-bundle-corpus-index-design.md:13:This spec defines a first-class **bundle corpus index** that:
docs\design\2026-04-27-bundle-corpus-index-design.md:15:- Opens a local filesystem corpus root and discovers FileSink 
bundle directories by finding `manifest.json`.
docs\design\2026-04-27-bundle-corpus-index-design.md:16:- Builds a small in-memory index from each bundle's manifest: 
`schemaVersion`, `SessionMetadata`, attachment descriptors, and derived manifest-only fields.
docs\design\2026-04-27-bundle-corpus-index-design.md:17:- Lists and filters corpus entries without reading JSONL 
streams, snapshots, sidecar bytes, commands, ticks, events, or markers.
docs\design\2026-04-27-bundle-corpus-index-design.md:18:- Provides deterministic iteration order for both metadata 
entries and full bundle iteration.
docs\design\2026-04-27-bundle-corpus-index-design.md:19:- Implements `Iterable<SessionBundle>` semantics so existing 
`runMetrics(bundles, metrics)` workflows work unchanged against disk-resident corpora.
docs\design\2026-04-27-bundle-corpus-index-design.md:20:- Exposes explicit on-demand escape hatches 
(`entry.openSource()`, `entry.loadBundle()`) for consumers that need replayer/content access.
docs\design\2026-04-27-bundle-corpus-index-design.md:21:- Defines corpus behavior for finalized, immutable-on-disk 
bundle directories. Callers construct a new corpus after generation, deletion, or mutation.
docs\design\2026-04-27-bundle-corpus-index-design.md:23:The deliverable is an additive API surface. Existing 
`FileSink`, `SessionRecorder`, `SessionReplayer`, and `runMetrics` behavior remains unchanged.
docs\design\2026-04-27-bundle-corpus-index-design.md:25:## 2. Non-Goals
docs\design\2026-04-27-bundle-corpus-index-design.md:27:- **Content indexing in v1.** Queries over `commands.jsonl`, 
`ticks.jsonl`, events, markers, snapshots, sidecar attachment bytes, or metric outputs are out of scope. v1 query 
predicates are manifest-derived only. Explicit dataUrl attachments can still place bytes inside `manifest.json`; v1 
reads those only as part of manifest parsing, not as a separate content index.
docs\design\2026-04-27-bundle-corpus-index-design.md:28:- **Metric-result indexing.** "Find bundles with high 
decision-point variance" requires either a game-defined metric pass or a future derived-summary index. v1 can feed 
matching bundles into `runMetrics`, but it does not persist metric summaries.
docs\design\2026-04-27-bundle-corpus-index-design.md:29:- **Persistent `corpus-index.json`.** The index is rebuilt 
from manifests at open time. A persisted cache creates invalidation, write coordination, and stale-index failure modes 
before the corpus is large enough to justify it.
docs\design\2026-04-27-bundle-corpus-index-design.md:30:- **Async / remote storage APIs.** v1 is synchronous and 
local-disk-only, matching FileSink and the engine's current synchronous session stack. A future `AsyncBundleCorpus` or 
`runMetricsAsync` can land when there is a real remote/backend storage pressure.
docs\design\2026-04-27-bundle-corpus-index-design.md:31:- **UI or viewer.** Standalone bundle viewer work remains Spec 
4. This spec is a library/query surface only.
docs\design\2026-04-27-bundle-corpus-index-design.md:32:- **Retention, compaction, delete, archive, or mutation 
policies.** v1 reads finalized corpora; it does not mutate bundle directories.
docs\design\2026-04-27-bundle-corpus-index-design.md:33:- **Schema migration.** v1 accepts 
`SESSION_BUNDLE_SCHEMA_VERSION` only. Future bundle schema versions need an explicit migration/loading story.
docs\design\2026-04-27-bundle-corpus-index-design.md:34:- **Live writer detection.** v1 does not try to detect or 
exclude active `SessionRecorder` / `FileSink` writers. Callers are responsible for building a corpus only after 
writers close.
docs\design\2026-04-27-bundle-corpus-index-design.md:36:## 3. Background
docs\design\2026-04-27-bundle-corpus-index-design.md:38:Spec 3 can generate many `SessionBundle`s via 
`runSynthPlaytest`. Spec 8 can reduce an `Iterable<SessionBundle>` through `runMetrics`. The missing piece is a 
durable corpus source: today a caller either keeps bundles in memory or manually walks directories and calls `new 
FileSink(dir).toBundle()` for each one.
docs\design\2026-04-27-bundle-corpus-index-design.md:40:FileSink already defines the disk format:
docs\design\2026-04-27-bundle-corpus-index-design.md:42:```text
docs\design\2026-04-27-bundle-corpus-index-design.md:43:<bundleDir>/
docs\design\2026-04-27-bundle-corpus-index-design.md:44:  manifest.json
docs\design\2026-04-27-bundle-corpus-index-design.md:45:  ticks.jsonl
docs\design\2026-04-27-bundle-corpus-index-design.md:46:  commands.jsonl
docs\design\2026-04-27-bundle-corpus-index-design.md:47:  executions.jsonl
docs\design\2026-04-27-bundle-corpus-index-design.md:48:  failures.jsonl
docs\design\2026-04-27-bundle-corpus-index-design.md:49:  markers.jsonl
docs\design\2026-04-27-bundle-corpus-index-design.md:50:  snapshots/<tick>.json
docs\design\2026-04-27-bundle-corpus-index-design.md:51:  attachments/<id>.<ext>
docs\design\2026-04-27-bundle-corpus-index-design.md:52:```
docs\design\2026-04-27-bundle-corpus-index-design.md:54:`manifest.json` is the natural v1 index unit because it 
contains `schemaVersion`, `metadata`, and attachments. It is atomically rewritten at `open()`, successful snapshot 
writes, and `close()`. Reading manifests is cheap and does not force loading streams, snapshots, or sidecar bytes. 
FileSink defaults to sidecar attachments, but explicit dataUrl attachments embed bytes in the manifest and therefore 
increase manifest parse cost.
docs\design\2026-04-27-bundle-corpus-index-design.md:56:The current `SessionReplayer.fromSource(source)` and 
`FileSink.toBundle()` path eagerly materializes a full bundle. This spec does not change that. Instead, it gives 
callers an efficient manifest-only listing/filtering layer and keeps full bundle loading explicit and per-entry.
docs\design\2026-04-27-bundle-corpus-index-design.md:58:The important boundary is that the corpus indexes a 
closed/frozen file tree. A construction-time manifest index is deterministic only if bundle directories do not keep 
changing underneath it. `metadata.incomplete` remains a manifest fact about abnormal termination, not a reliable 
signal that a writer is still active.
docs\design\2026-04-27-bundle-corpus-index-design.md:60:## 4. Architecture Overview
docs\design\2026-04-27-bundle-corpus-index-design.md:62:New module: `src/bundle-corpus.ts`.
docs\design\2026-04-27-bundle-corpus-index-design.md:64:| Component | Responsibility |
docs\design\2026-04-27-bundle-corpus-index-design.md:65:| --- | --- |
docs\design\2026-04-27-bundle-corpus-index-design.md:66:| `BundleCorpus` | Opens a corpus root, scans for bundle 
manifests, stores a deterministic in-memory entry index, exposes `entries(query?)`, `bundles(query?)`, `get(key)`, 
`openSource(key)`, `loadBundle(key)`, and `[Symbol.iterator]`. |
docs\design\2026-04-27-bundle-corpus-index-design.md:67:| `BundleCorpusEntry` | Immutable metadata view for one bundle 
directory plus explicit `openSource()` and `loadBundle()` methods. |
docs\design\2026-04-27-bundle-corpus-index-design.md:68:| `BundleQuery` | Manifest-only filters over `SessionMetadata` 
and derived fields. |
docs\design\2026-04-27-bundle-corpus-index-design.md:69:| `CorpusIndexError` | `SessionRecordingError` subclass thrown 
for malformed manifests, unsupported schema versions, duplicate discovered keys, invalid query ranges, or missing keys 
when strict behavior is expected. |
docs\design\2026-04-27-bundle-corpus-index-design.md:71:Data flow:
docs\design\2026-04-27-bundle-corpus-index-design.md:73:```text
docs\design\2026-04-27-bundle-corpus-index-design.md:74:BundleCorpus(root)
docs\design\2026-04-27-bundle-corpus-index-design.md:75:  -> scan for manifest.json
docs\design\2026-04-27-bundle-corpus-index-design.md:76:  -> parse/validate manifest metadata
docs\design\2026-04-27-bundle-corpus-index-design.md:77:  -> derive index fields
docs\design\2026-04-27-bundle-corpus-index-design.md:78:  -> sort entries by canonical corpus order
docs\design\2026-04-27-bundle-corpus-index-design.md:80:entries(query)
docs\design\2026-04-27-bundle-corpus-index-design.md:81:  -> validate query
docs\design\2026-04-27-bundle-corpus-index-design.md:82:  -> filter in-memory manifest entries only
docs\design\2026-04-27-bundle-corpus-index-design.md:83:  -> return stable ordered entry array
docs\design\2026-04-27-bundle-corpus-index-design.md:85:bundles(query) / [Symbol.iterator]
docs\design\2026-04-27-bundle-corpus-index-design.md:86:  -> entries(query)
docs\design\2026-04-27-bundle-corpus-index-design.md:87:  -> for each entry: entry.loadBundle()
docs\design\2026-04-27-bundle-corpus-index-design.md:88:       -> new FileSink(entry.dir).toBundle()
docs\design\2026-04-27-bundle-corpus-index-design.md:89:       -> yields SessionBundle
docs\design\2026-04-27-bundle-corpus-index-design.md:91:runMetrics(corpus.bundles({ sourceKind: 'synthetic', 
incomplete: false }), metrics)
docs\design\2026-04-27-bundle-corpus-index-design.md:92:  -> unchanged Spec 8 reducer
docs\design\2026-04-27-bundle-corpus-index-design.md:93:```
docs\design\2026-04-27-bundle-corpus-index-design.md:95:## 5. API + Types
docs\design\2026-04-27-bundle-corpus-index-design.md:97:### 5.1 Construction
docs\design\2026-04-27-bundle-corpus-index-design.md:99:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:100:export type BundleCorpusScanDepth = 'root' | 'children' | 
'all';
docs\design\2026-04-27-bundle-corpus-index-design.md:102:export interface BundleCorpusOptions {
docs\design\2026-04-27-bundle-corpus-index-design.md:103:  /**
docs\design\2026-04-27-bundle-corpus-index-design.md:104:   * How far discovery descends from rootDir. Default 'all'.
docs\design\2026-04-27-bundle-corpus-index-design.md:105:   * 'root' checks only rootDir.
docs\design\2026-04-27-bundle-corpus-index-design.md:106:   * 'children' checks rootDir and immediate child 
directories.
docs\design\2026-04-27-bundle-corpus-index-design.md:107:   * 'all' recursively checks rootDir and all non-symlink 
descendant directories.
docs\design\2026-04-27-bundle-corpus-index-design.md:108:   */
docs\design\2026-04-27-bundle-corpus-index-design.md:109:  scanDepth?: BundleCorpusScanDepth;
docs\design\2026-04-27-bundle-corpus-index-design.md:110:  /**
docs\design\2026-04-27-bundle-corpus-index-design.md:111:   * If false (default), the first invalid manifest aborts 
construction with CorpusIndexError.
docs\design\2026-04-27-bundle-corpus-index-design.md:112:   * If true, invalid manifests are recorded in 
corpus.invalidEntries and omitted from entries().
docs\design\2026-04-27-bundle-corpus-index-design.md:113:   */
docs\design\2026-04-27-bundle-corpus-index-design.md:114:  skipInvalid?: boolean;
docs\design\2026-04-27-bundle-corpus-index-design.md:115:}
docs\design\2026-04-27-bundle-corpus-index-design.md:117:export class BundleCorpus implements Iterable<SessionBundle> {
docs\design\2026-04-27-bundle-corpus-index-design.md:118:  constructor(rootDir: string, options?: BundleCorpusOptions);
docs\design\2026-04-27-bundle-corpus-index-design.md:119:  readonly rootDir: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:120:  readonly invalidEntries: readonly InvalidCorpusEntry[];
docs\design\2026-04-27-bundle-corpus-index-design.md:121:  entries(query?: BundleQuery): readonly BundleCorpusEntry[];
docs\design\2026-04-27-bundle-corpus-index-design.md:122:  bundles(query?: BundleQuery): 
IterableIterator<SessionBundle>;
docs\design\2026-04-27-bundle-corpus-index-design.md:123:  get(key: string): BundleCorpusEntry | undefined;
docs\design\2026-04-27-bundle-corpus-index-design.md:124:  openSource(key: string): SessionSource;
docs\design\2026-04-27-bundle-corpus-index-design.md:125:  loadBundle<
docs\design\2026-04-27-bundle-corpus-index-design.md:126:    TEventMap extends Record<keyof TEventMap, unknown> = 
Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-design.md:127:    TCommandMap extends Record<keyof TCommandMap, unknown> = 
Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-design.md:128:    TDebug = JsonValue,
docs\design\2026-04-27-bundle-corpus-index-design.md:129:  >(key: string): SessionBundle<TEventMap, TCommandMap, 
TDebug>;
docs\design\2026-04-27-bundle-corpus-index-design.md:130:  [Symbol.iterator](): IterableIterator<SessionBundle>;
docs\design\2026-04-27-bundle-corpus-index-design.md:131:}
docs\design\2026-04-27-bundle-corpus-index-design.md:132:```
docs\design\2026-04-27-bundle-corpus-index-design.md:134:The constructor performs manifest discovery synchronously. 
Construction is the only manifest scan. `entries()` and `bundles()` operate over that in-memory entry set; callers who 
want to see newly written bundles construct a new `BundleCorpus`.
docs\design\2026-04-27-bundle-corpus-index-design.md:136:`openSource(key)` and `loadBundle(key)` throw 
`CorpusIndexError` with `details.code === 'entry_missing'` when the key is not present. `get(key)` is the non-throwing 
lookup.
docs\design\2026-04-27-bundle-corpus-index-design.md:138:The `loadBundle` generics mirror `SessionBundle`'s static 
type parameters. They are caller assertions, just like passing a typed bundle into replay/metric helpers: 
`BundleCorpus` validates the FileSink manifest/schema and materializes bytes through `FileSink`, but it does not prove 
game-specific event, command, or debug payload schemas at runtime.
docs\design\2026-04-27-bundle-corpus-index-design.md:140:### 5.2 Entries
docs\design\2026-04-27-bundle-corpus-index-design.md:142:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:143:export interface BundleCorpusEntry {
docs\design\2026-04-27-bundle-corpus-index-design.md:144:  readonly key: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:145:  readonly dir: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:146:  readonly schemaVersion: typeof 
SESSION_BUNDLE_SCHEMA_VERSION;
docs\design\2026-04-27-bundle-corpus-index-design.md:147:  readonly metadata: Readonly<SessionMetadata>;
docs\design\2026-04-27-bundle-corpus-index-design.md:148:  readonly attachmentCount: number;
docs\design\2026-04-27-bundle-corpus-index-design.md:149:  readonly attachmentBytes: number;
docs\design\2026-04-27-bundle-corpus-index-design.md:150:  readonly attachmentMimes: readonly string[];
docs\design\2026-04-27-bundle-corpus-index-design.md:151:  readonly hasFailures: boolean;
docs\design\2026-04-27-bundle-corpus-index-design.md:152:  readonly failedTickCount: number;
docs\design\2026-04-27-bundle-corpus-index-design.md:153:  readonly materializedEndTick: number;
docs\design\2026-04-27-bundle-corpus-index-design.md:154:  openSource(): SessionSource;
docs\design\2026-04-27-bundle-corpus-index-design.md:155:  loadBundle<
docs\design\2026-04-27-bundle-corpus-index-design.md:156:    TEventMap extends Record<keyof TEventMap, unknown> = 
Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-design.md:157:    TCommandMap extends Record<keyof TCommandMap, unknown> = 
Record<string, never>,
docs\design\2026-04-27-bundle-corpus-index-design.md:158:    TDebug = JsonValue,
docs\design\2026-04-27-bundle-corpus-index-design.md:159:  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
docs\design\2026-04-27-bundle-corpus-index-design.md:160:}
docs\design\2026-04-27-bundle-corpus-index-design.md:161:```
docs\design\2026-04-27-bundle-corpus-index-design.md:163:`key` is the corpus-root-relative bundle directory path with 
`/` separators. If `rootDir` itself is a bundle, its key is exactly `'.'`. Descendant bundle keys never start with 
`./`; for example, `rootDir/a/b/manifest.json` yields `a/b`. `key` is the primary identity because 
`metadata.sessionId` can collide when bundles are copied or duplicated. `dir` is the absolute resolved directory path 
used by `FileSink`.
docs\design\2026-04-27-bundle-corpus-index-design.md:165:`materializedEndTick` is `metadata.incomplete === true ? 
metadata.persistedEndTick : metadata.endTick`. It is the manifest's incomplete-aware upper bound for persisted bundle 
content, not a guarantee that `SessionReplayer.openAt(materializedEndTick)` will succeed. Replay can still fail at or 
after `metadata.failedTicks`, when command payloads are missing, or when full bundle integrity checks fail. 
`SessionReplayer` remains the authority for actual replayability.
docs\design\2026-04-27-bundle-corpus-index-design.md:167:`metadata` is exposed as a frozen defensive copy. The 
implementation also copies and freezes `metadata.failedTicks` when present, then freezes the entry object. Callers 
cannot mutate the corpus index by mutating a returned entry.
docs\design\2026-04-27-bundle-corpus-index-design.md:169:### 5.3 Query
docs\design\2026-04-27-bundle-corpus-index-design.md:171:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:172:export type OneOrMany<T> = T | readonly T[];
docs\design\2026-04-27-bundle-corpus-index-design.md:174:export interface NumberRange {
docs\design\2026-04-27-bundle-corpus-index-design.md:175:  min?: number;
docs\design\2026-04-27-bundle-corpus-index-design.md:176:  max?: number;
docs\design\2026-04-27-bundle-corpus-index-design.md:177:}
docs\design\2026-04-27-bundle-corpus-index-design.md:179:export interface IsoTimeRange {
docs\design\2026-04-27-bundle-corpus-index-design.md:180:  from?: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:181:  to?: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:182:}
docs\design\2026-04-27-bundle-corpus-index-design.md:184:export interface BundleQuery {
docs\design\2026-04-27-bundle-corpus-index-design.md:185:  key?: string | RegExp;
docs\design\2026-04-27-bundle-corpus-index-design.md:186:  sessionId?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-design.md:187:  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
docs\design\2026-04-27-bundle-corpus-index-design.md:188:  sourceLabel?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-design.md:189:  engineVersion?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-design.md:190:  nodeVersion?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-design.md:191:  incomplete?: boolean;
docs\design\2026-04-27-bundle-corpus-index-design.md:192:  durationTicks?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:193:  startTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:194:  endTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:195:  persistedEndTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:196:  materializedEndTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:197:  failedTickCount?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:198:  policySeed?: number | NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:199:  recordedAt?: IsoTimeRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:200:  attachmentMime?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-design.md:201:}
docs\design\2026-04-27-bundle-corpus-index-design.md:202:```
docs\design\2026-04-27-bundle-corpus-index-design.md:204:All query fields are ANDed. `OneOrMany` scalar fields match 
if the entry value equals any requested value. Ranges are inclusive. A range with `min > max`, non-finite numeric 
bounds, or a non-integer tick bound throws `CorpusIndexError` with `details.code === 'query_invalid'`.
docs\design\2026-04-27-bundle-corpus-index-design.md:206:Optional manifest fields (`sourceLabel`, `policySeed`) match 
only when the entry has a defined value. A `policySeed` filter therefore selects seeded synthetic bundles and excludes 
non-synthetic bundles whose metadata has no seed.
docs\design\2026-04-27-bundle-corpus-index-design.md:208:`attachmentMime` matches if any MIME in 
`entry.attachmentMimes` equals any requested MIME. It is an any-match filter, not an exact-set or all-attachments 
filter.
docs\design\2026-04-27-bundle-corpus-index-design.md:210:`endTick`, `persistedEndTick`, and `materializedEndTick` are 
all exposed because they are distinct manifest/debugging facts. For "has persisted content through tick X" queries, 
use `materializedEndTick`; raw `endTick` can overstate the persisted range for finalized incomplete bundles. For 
actual replay, use `SessionReplayer.openAt()` and let it enforce failure and content-integrity constraints.
docs\design\2026-04-27-bundle-corpus-index-design.md:212:`recordedAt` filters use lexical comparison over normalized 
UTC ISO strings. Query bounds must be UTC ISO-8601 strings that round-trip through `new Date(value).toISOString()` and 
end in `Z`; any other form throws `CorpusIndexError` with `details.code === 'query_invalid'`. Current FileSink writers 
already emit this form.
docs\design\2026-04-27-bundle-corpus-index-design.md:214:`RegExp` on `key` is local-process-only convenience. Queries 
are not JSON-serialized in v1.
docs\design\2026-04-27-bundle-corpus-index-design.md:216:No function predicate is part of `BundleQuery`. Callers who 
need arbitrary conditions can use normal JavaScript on the returned array:
docs\design\2026-04-27-bundle-corpus-index-design.md:218:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:219:const longSynthetic = corpus.entries({ sourceKind: 
'synthetic' })
docs\design\2026-04-27-bundle-corpus-index-design.md:220:  .filter((entry) => entry.metadata.durationTicks > 1000);
docs\design\2026-04-27-bundle-corpus-index-design.md:221:```
docs\design\2026-04-27-bundle-corpus-index-design.md:223:This keeps the engine API small and makes the manifest-only 
boundary obvious.
docs\design\2026-04-27-bundle-corpus-index-design.md:225:### 5.4 Errors
docs\design\2026-04-27-bundle-corpus-index-design.md:227:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:228:export type CorpusIndexErrorCode =
docs\design\2026-04-27-bundle-corpus-index-design.md:229:  | 'root_missing'
docs\design\2026-04-27-bundle-corpus-index-design.md:230:  | 'manifest_parse'
docs\design\2026-04-27-bundle-corpus-index-design.md:231:  | 'manifest_invalid'
docs\design\2026-04-27-bundle-corpus-index-design.md:232:  | 'schema_unsupported'
docs\design\2026-04-27-bundle-corpus-index-design.md:233:  | 'duplicate_key'
docs\design\2026-04-27-bundle-corpus-index-design.md:234:  | 'query_invalid'
docs\design\2026-04-27-bundle-corpus-index-design.md:235:  | 'entry_missing';
docs\design\2026-04-27-bundle-corpus-index-design.md:237:export interface CorpusIndexErrorDetails {
docs\design\2026-04-27-bundle-corpus-index-design.md:238:  readonly [key: string]: JsonValue;
docs\design\2026-04-27-bundle-corpus-index-design.md:239:  readonly code: CorpusIndexErrorCode;
docs\design\2026-04-27-bundle-corpus-index-design.md:240:  readonly path?: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:241:  readonly key?: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:242:  readonly message?: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:243:}
docs\design\2026-04-27-bundle-corpus-index-design.md:245:export class CorpusIndexError extends SessionRecordingError {
docs\design\2026-04-27-bundle-corpus-index-design.md:246:  override readonly details: CorpusIndexErrorDetails;
docs\design\2026-04-27-bundle-corpus-index-design.md:247:}
docs\design\2026-04-27-bundle-corpus-index-design.md:249:export interface InvalidCorpusEntry {
docs\design\2026-04-27-bundle-corpus-index-design.md:250:  readonly path: string;
docs\design\2026-04-27-bundle-corpus-index-design.md:251:  readonly error: CorpusIndexError;
docs\design\2026-04-27-bundle-corpus-index-design.md:252:}
docs\design\2026-04-27-bundle-corpus-index-design.md:253:```
docs\design\2026-04-27-bundle-corpus-index-design.md:255:Default construction is strict: invalid manifests throw. With 
`skipInvalid: true`, invalid manifests are collected in `invalidEntries`, omitted from `entries()`, and do not affect 
iteration. Full bundle load failures from malformed JSONL or missing snapshots are not swallowed; they surface when 
`loadBundle()` or `bundles()` reaches that entry. Sidecar-byte integrity is different: `FileSink.toBundle()` does not 
read sidecar payloads, so missing sidecar bytes surface only when a caller dereferences them through 
`SessionSource.readSidecar(id)` or equivalent source-level access.
docs\design\2026-04-27-bundle-corpus-index-design.md:257:`details.code` is the public discriminator, following the 
existing session-recording error discipline. `details.path`, `details.key`, and other fields are JSON-shaped 
information that can be logged or serialized without carrying raw filesystem handles or exception objects.
docs\design\2026-04-27-bundle-corpus-index-design.md:259:## 6. Lifecycle / Contracts
docs\design\2026-04-27-bundle-corpus-index-design.md:261:`BundleCorpus` is a snapshot of a closed/frozen corpus at 
construction time. It does not watch the filesystem. It also does not copy bundle streams or snapshots into memory 
during construction. This is intentional: deterministic analysis and CI should operate over a stable set of files. 
Callers create a new corpus object after generating, deleting, or mutating bundles.
docs\design\2026-04-27-bundle-corpus-index-design.md:263:Active writers are unsupported in v1. A bundle directory 
being written by `SessionRecorder` or `FileSink` can have a manifest that is atomically readable while JSONL streams 
and snapshots are still changing. `BundleCorpus` does not detect that state and does not guarantee consistent 
`entries()` / `loadBundle()` behavior for it. Generators should close sinks before constructing the corpus.
docs\design\2026-04-27-bundle-corpus-index-design.md:265:Construction contract:
docs\design\2026-04-27-bundle-corpus-index-design.md:267:1. Resolve `rootDir` to an absolute directory path.
docs\design\2026-04-27-bundle-corpus-index-design.md:268:2. If root does not exist or is not a directory, throw 
`CorpusIndexError` with `details.code === 'root_missing'`.
docs\design\2026-04-27-bundle-corpus-index-design.md:269:3. Discover `manifest.json` files according to `scanDepth`.
docs\design\2026-04-27-bundle-corpus-index-design.md:270:4. Do not follow symlinks or Windows junctions during 
discovery. Directory symlinks are skipped.
docs\design\2026-04-27-bundle-corpus-index-design.md:271:5. Stop descending into a directory once it is identified as 
a bundle directory by a direct `manifest.json`.
docs\design\2026-04-27-bundle-corpus-index-design.md:272:6. Parse each manifest as JSON.
docs\design\2026-04-27-bundle-corpus-index-design.md:273:7. Validate `schemaVersion === 
SESSION_BUNDLE_SCHEMA_VERSION`, `metadata` shape, `metadata.recordedAt` normalized UTC `Z` form, and `attachments` 
array shape. Non-canonical `recordedAt` values are `manifest_invalid` because canonical ordering and time filters 
depend on lexical UTC ISO comparison.
docs\design\2026-04-27-bundle-corpus-index-design.md:274:8. Derive manifest-only fields.
docs\design\2026-04-27-bundle-corpus-index-design.md:275:9. Sort entries in canonical order.
docs\design\2026-04-27-bundle-corpus-index-design.md:277:`scanDepth` semantics:
docs\design\2026-04-27-bundle-corpus-index-design.md:279:- `'root'`: check only `rootDir` itself. Use this when the 
root is a single bundle directory.
docs\design\2026-04-27-bundle-corpus-index-design.md:280:- `'children'`: check `rootDir` and its immediate non-symlink 
child directories. Use this for a flat corpus where each child is one bundle.
docs\design\2026-04-27-bundle-corpus-index-design.md:281:- `'all'`: recursively check `rootDir` and all non-symlink 
descendants. This is the default for nested corpus trees.
docs\design\2026-04-27-bundle-corpus-index-design.md:283:Discovery should not descend into a directory after it has 
found a `manifest.json` in that directory. A bundle's `snapshots/` and `attachments/` subdirectories are not separate 
corpus roots.
docs\design\2026-04-27-bundle-corpus-index-design.md:285:Key derivation is deterministic. The root bundle key is 
`'.'`; descendant keys are slash-separated relative paths with no leading `./`. Backslashes from Windows paths are 
normalized to `/`.
docs\design\2026-04-27-bundle-corpus-index-design.md:287:Canonical order is:
docs\design\2026-04-27-bundle-corpus-index-design.md:289:```text
docs\design\2026-04-27-bundle-corpus-index-design.md:290:metadata.recordedAt ASC, metadata.sessionId ASC, key ASC
docs\design\2026-04-27-bundle-corpus-index-design.md:291:```
docs\design\2026-04-27-bundle-corpus-index-design.md:293:This order is deterministic for a stable corpus and useful 
for human reading. The `key` tiebreaker closes timestamp/session collisions.
docs\design\2026-04-27-bundle-corpus-index-design.md:295:## 7. Bundle Format Integration
docs\design\2026-04-27-bundle-corpus-index-design.md:297:Spec 7 composes with FileSink's existing format. It does not 
add files to a bundle directory and does not require FileSink to write index-specific sidecars.
docs\design\2026-04-27-bundle-corpus-index-design.md:299:`BundleCorpusEntry.openSource()` returns `new 
FileSink(entry.dir)` typed as `SessionSource`. `FileSink` already reloads `manifest.json` in its constructor and 
implements the read-side methods. `BundleCorpusEntry.loadBundle()` returns `entry.openSource().toBundle()` with the 
caller-asserted generic type applied at the corpus boundary. This preserves the single source of truth for full bundle 
materialization: FileSink owns bundle loading.
docs\design\2026-04-27-bundle-corpus-index-design.md:301:The manifest may contain dataUrl attachment bytes when a 
caller explicitly opted into manifest embedding. `BundleCorpus` still treats those as manifest bytes: it parses 
descriptors and derives MIME/count/size metadata, but it does not decode, inspect, or index the embedded payload.
docs\design\2026-04-27-bundle-corpus-index-design.md:303:Manifest-derived fields:
docs\design\2026-04-27-bundle-corpus-index-design.md:305:- `schemaVersion`: from manifest.
docs\design\2026-04-27-bundle-corpus-index-design.md:306:- `metadata`: frozen defensive copy of `SessionMetadata`; 
`failedTicks` is copied and frozen when present.
docs\design\2026-04-27-bundle-corpus-index-design.md:307:- `attachmentCount`: `manifest.attachments.length`.
docs\design\2026-04-27-bundle-corpus-index-design.md:308:- `attachmentBytes`: sum of `attachments[].sizeBytes`.
docs\design\2026-04-27-bundle-corpus-index-design.md:309:- `attachmentMimes`: sorted unique `attachments[].mime` 
values.
docs\design\2026-04-27-bundle-corpus-index-design.md:310:- `hasFailures`: `(metadata.failedTicks?.length ?? 0) > 0`.
docs\design\2026-04-27-bundle-corpus-index-design.md:311:- `failedTickCount`: `metadata.failedTicks?.length ?? 0`.
docs\design\2026-04-27-bundle-corpus-index-design.md:312:- `materializedEndTick`: finalized-manifest, incomplete-aware 
upper bound for persisted content.
docs\design\2026-04-27-bundle-corpus-index-design.md:314:Content-derived fields are intentionally absent. For example, 
command type counts belong either in Spec 8 metrics or in a later content-summary index.
docs\design\2026-04-27-bundle-corpus-index-design.md:316:## 8. Determinism
docs\design\2026-04-27-bundle-corpus-index-design.md:318:Filesystem enumeration order is not portable. `BundleCorpus` 
sorts entries using the canonical order above before exposing them. `entries(query)` and `bundles(query)` preserve 
that order after filtering. `[Symbol.iterator]` delegates to `bundles()` with no query.
docs\design\2026-04-27-bundle-corpus-index-design.md:320:This matters for user-defined metrics marked `orderSensitive: 
true`. Spec 8's built-ins are order-insensitive, but the corpus should still offer stable iteration so order-sensitive 
user metrics can opt into a deterministic disk-backed source.
docs\design\2026-04-27-bundle-corpus-index-design.md:322:Symlinks/junctions are skipped rather than followed. This 
avoids platform-specific traversal and symlink-loop behavior, and it keeps discovery bounded by the real directory 
tree under `rootDir`.
docs\design\2026-04-27-bundle-corpus-index-design.md:324:Volatile metadata remains volatile. The corpus can query 
`sessionId` and `recordedAt`, but it does not normalize or hide them. Built-in metrics still avoid volatile fields.
docs\design\2026-04-27-bundle-corpus-index-design.md:326:## 9. CI Pattern
docs\design\2026-04-27-bundle-corpus-index-design.md:328:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:329:import {
docs\design\2026-04-27-bundle-corpus-index-design.md:330:  BundleCorpus,
docs\design\2026-04-27-bundle-corpus-index-design.md:331:  runMetrics,
docs\design\2026-04-27-bundle-corpus-index-design.md:332:  bundleCount,
docs\design\2026-04-27-bundle-corpus-index-design.md:333:  sessionLengthStats,
docs\design\2026-04-27-bundle-corpus-index-design.md:334:  commandValidationAcceptanceRate,
docs\design\2026-04-27-bundle-corpus-index-design.md:335:} from 'civ-engine';
docs\design\2026-04-27-bundle-corpus-index-design.md:337:const corpus = new BundleCorpus('artifacts/synth-corpus');
docs\design\2026-04-27-bundle-corpus-index-design.md:339:const current = runMetrics(
docs\design\2026-04-27-bundle-corpus-index-design.md:340:  corpus.bundles({ sourceKind: 'synthetic', incomplete: false 
}),
docs\design\2026-04-27-bundle-corpus-index-design.md:341:  [
docs\design\2026-04-27-bundle-corpus-index-design.md:342:    bundleCount(),
docs\design\2026-04-27-bundle-corpus-index-design.md:343:    sessionLengthStats(),
docs\design\2026-04-27-bundle-corpus-index-design.md:344:    commandValidationAcceptanceRate(),
docs\design\2026-04-27-bundle-corpus-index-design.md:345:  ],
docs\design\2026-04-27-bundle-corpus-index-design.md:346:);
docs\design\2026-04-27-bundle-corpus-index-design.md:348:console.log(corpus.entries({ failedTickCount: { min: 1 } 
}).map((entry) => entry.key));
docs\design\2026-04-27-bundle-corpus-index-design.md:349:console.log(current);
docs\design\2026-04-27-bundle-corpus-index-design.md:350:```
docs\design\2026-04-27-bundle-corpus-index-design.md:352:For replay investigation:
docs\design\2026-04-27-bundle-corpus-index-design.md:354:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:355:const failed = corpus.entries({ failedTickCount: { min: 1 } 
})[0];
docs\design\2026-04-27-bundle-corpus-index-design.md:356:if (!failed) {
docs\design\2026-04-27-bundle-corpus-index-design.md:357:  throw new Error('no failed bundle matched the query');
docs\design\2026-04-27-bundle-corpus-index-design.md:358:}
docs\design\2026-04-27-bundle-corpus-index-design.md:359:const source = failed.openSource();
docs\design\2026-04-27-bundle-corpus-index-design.md:360:const replayer = SessionReplayer.fromSource(source, { 
worldFactory });
docs\design\2026-04-27-bundle-corpus-index-design.md:361:const firstFailure = failed.metadata.failedTicks![0];
docs\design\2026-04-27-bundle-corpus-index-design.md:362:if (firstFailure <= failed.metadata.startTick) {
docs\design\2026-04-27-bundle-corpus-index-design.md:363:  throw new Error('failure occurred at the first recorded 
tick; inspect snapshots directly');
docs\design\2026-04-27-bundle-corpus-index-design.md:364:}
docs\design\2026-04-27-bundle-corpus-index-design.md:365:const beforeFailure = firstFailure - 1;
docs\design\2026-04-27-bundle-corpus-index-design.md:366:const world = replayer.openAt(beforeFailure);
docs\design\2026-04-27-bundle-corpus-index-design.md:367:```
docs\design\2026-04-27-bundle-corpus-index-design.md:369:For bundles without recorded failures, 
`entry.materializedEndTick` is the manifest-derived upper bound to try first. `SessionReplayer.openAt()` still owns 
the final replayability decision because it also checks command payloads and full bundle integrity.
docs\design\2026-04-27-bundle-corpus-index-design.md:371:For custom metadata filters:
docs\design\2026-04-27-bundle-corpus-index-design.md:373:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:374:const longRuns = corpus.entries({ sourceKind: 'synthetic' })
docs\design\2026-04-27-bundle-corpus-index-design.md:375:  .filter((entry) => entry.metadata.durationTicks >= 1000);
docs\design\2026-04-27-bundle-corpus-index-design.md:376:const longRunMetrics = runMetrics(longRuns.map((entry) => 
entry.loadBundle()), [bundleCount()]);
docs\design\2026-04-27-bundle-corpus-index-design.md:377:```
docs\design\2026-04-27-bundle-corpus-index-design.md:379:`Array.prototype.map` is fine here because `entries()` 
returns an in-memory entry array. For very large corpora, use a generator around entries to avoid materializing 
bundles:
docs\design\2026-04-27-bundle-corpus-index-design.md:381:```ts
docs\design\2026-04-27-bundle-corpus-index-design.md:382:function* bundlesFor(entries: readonly BundleCorpusEntry[]) {
docs\design\2026-04-27-bundle-corpus-index-design.md:383:  for (const entry of entries) yield entry.loadBundle();
docs\design\2026-04-27-bundle-corpus-index-design.md:384:}
docs\design\2026-04-27-bundle-corpus-index-design.md:385:```
docs\design\2026-04-27-bundle-corpus-index-design.md:387:## 10. Performance
docs\design\2026-04-27-bundle-corpus-index-design.md:389:Construction cost is O(number of directories visited + number 
of manifests). No JSONL streams, snapshot files, or sidecar bytes are read during construction or `entries()`. Each 
manifest parse is usually small and bounded by metadata plus attachment descriptors because FileSink defaults 
attachments to sidecars; explicit dataUrl attachments are embedded in `manifest.json` and can make manifest parsing 
larger.
docs\design\2026-04-27-bundle-corpus-index-design.md:391:`entries(query)` is O(number of indexed entries) and 
allocation-light: it returns a new array of existing frozen entry objects. `bundles(query)` is O(number of matching 
entries) plus full bundle load cost per yielded entry. Because `loadBundle()` delegates to `FileSink.toBundle()`, full 
bundle memory cost is exactly today's eager bundle materialization cost, paid one bundle at a time by generator 
consumers.
docs\design\2026-04-27-bundle-corpus-index-design.md:393:No persisted index cache ships in v1. If corpus construction 
becomes a measured bottleneck, a future spec can add `writeCorpusIndex()` with explicit invalidation fields (manifest 
mtime, size, and schema version). Until then, rebuilding from manifests is simpler and less fragile.
docs\design\2026-04-27-bundle-corpus-index-design.md:395:Skipping symlinks is also a performance guard: recursive 
discovery never traverses a linked external tree or loop.
docs\design\2026-04-27-bundle-corpus-index-design.md:397:## 11. Testing Strategy
docs\design\2026-04-27-bundle-corpus-index-design.md:399:Unit and integration tests target:
docs\design\2026-04-27-bundle-corpus-index-design.md:401:- **Discovery:** root itself can be a bundle with key `'.'`; 
flat child bundles are found with `scanDepth: 'children'`; recursive nested bundles are found with `scanDepth: 'all'`; 
`scanDepth: 'root'` skips children; `scanDepth: 'children'` skips grandchildren.
docs\design\2026-04-27-bundle-corpus-index-design.md:402:- **Symlink handling:** directory symlinks or junction-like 
entries are skipped and do not produce duplicate entries or recursive loops where the platform/test environment 
supports symlink creation.
docs\design\2026-04-27-bundle-corpus-index-design.md:403:- **Stable ordering:** files created in arbitrary order still 
produce entries sorted by canonical `recordedAt`, then `sessionId`, then `key`.
docs\design\2026-04-27-bundle-corpus-index-design.md:404:- **Manifest-only listing:** `entries()` does not read JSONL 
streams or snapshots. A bundle with a valid manifest but malformed `ticks.jsonl` still appears in `entries()`, and the 
malformed stream error surfaces only when `loadBundle()` is called.
docs\design\2026-04-27-bundle-corpus-index-design.md:405:- **Sidecar boundary:** a bundle with a manifest-sidecar 
descriptor but missing sidecar bytes can still be listed and loaded as a `SessionBundle`; the missing bytes surface 
only when `readSidecar(id)` is called on the opened source.
docs\design\2026-04-27-bundle-corpus-index-design.md:406:- **Query filters:** each built-in filter shape has coverage: 
exact `sourceKind`, optional `sourceLabel`, `incomplete`, numeric ranges, `policySeed`, normalized `recordedAt`, 
`attachmentMime`, and `failedTickCount`. Combined filters are ANDed.
docs\design\2026-04-27-bundle-corpus-index-design.md:407:- **Attachment MIME matching:** `attachmentMime` matches when 
any entry MIME equals any requested MIME; multi-attachment bundles prove it is not all-match or exact-set matching.
docs\design\2026-04-27-bundle-corpus-index-design.md:408:- **Optional field semantics:** `policySeed` and 
`sourceLabel` filters exclude entries where the field is undefined.
docs\design\2026-04-27-bundle-corpus-index-design.md:409:- **Tick horizon guidance:** `materializedEndTick` equals 
`persistedEndTick` for finalized incomplete bundles and `endTick` for complete bundles; raw `endTick` remains 
queryable but does not replace the materialized-content field. Recorded failures remain a replay-level constraint 
enforced by `SessionReplayer`.
docs\design\2026-04-27-bundle-corpus-index-design.md:410:- **Invalid queries:** non-finite numeric ranges, `min > 
max`, non-integer tick bounds, and non-UTC-Z `recordedAt` bounds throw `CorpusIndexError` with `details.code === 
'query_invalid'`.
docs\design\2026-04-27-bundle-corpus-index-design.md:411:- **Invalid manifests:** strict mode throws 
`CorpusIndexError`; `skipInvalid: true` records `invalidEntries` and omits bad entries. Non-canonical 
`metadata.recordedAt` is covered as `manifest_invalid`.
docs\design\2026-04-27-bundle-corpus-index-design.md:412:- **Missing keys:** `corpus.get(key)` returns `undefined`; 
`corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
docs\design\2026-04-27-bundle-corpus-index-design.md:413:- **Error taxonomy:** `CorpusIndexError` is an `instanceof 
SessionRecordingError` and preserves JSON-shaped details with the discriminator at `details.code`.
docs\design\2026-04-27-bundle-corpus-index-design.md:414:- **FileSink integration:** `entry.openSource()` reads 
snapshots and sidecars through FileSink; `entry.loadBundle()` matches `new FileSink(dir).toBundle()` for full bundle 
materialization.
docs\design\2026-04-27-bundle-corpus-index-design.md:415:- **runMetrics integration:** 
`runMetrics(corpus.bundles(query), metrics)` produces the same result as `runMetrics(matchingEntries.map((e) => 
e.loadBundle()), metrics)`.
docs\design\2026-04-27-bundle-corpus-index-design.md:416:- **Defensive entry surface:** mutation attempts against 
returned entries, metadata, or `failedTicks` cannot affect subsequent `entries()` results.
docs\design\2026-04-27-bundle-corpus-index-design.md:417:- **Closed-corpus contract:** tests should document the 
boundary by constructing corpora only after sinks close. v1 does not test live-writer detection because the feature 
explicitly does not exist.
docs\design\2026-04-27-bundle-corpus-index-design.md:419:Tests should create real temporary FileSink bundle 
directories, not hand-written partial shapes except for malformed-manifest, malformed-stream, and sidecar-boundary 
cases.
docs\design\2026-04-27-bundle-corpus-index-design.md:421:## 12. Doc Surface
docs\design\2026-04-27-bundle-corpus-index-design.md:423:Per AGENTS.md, implementation updates:
docs\design\2026-04-27-bundle-corpus-index-design.md:425:- `docs/api-reference.md`: new `## Bundle Corpus Index 
(v0.8.3)` section for `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, 
`BundleQuery`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, 
and `InvalidCorpusEntry`.
docs\design\2026-04-27-bundle-corpus-index-design.md:426:- `docs/guides/bundle-corpus-index.md`: quickstart, metadata 
query guide, `runMetrics` integration, replay investigation example, closed-corpus contract, incomplete-bundle 
behavior, sidecar boundary, scan-depth behavior, limitations.
docs\design\2026-04-27-bundle-corpus-index-design.md:427:- `docs/guides/behavioral-metrics.md`: replace in-memory-only 
corpus examples with a disk-backed `BundleCorpus` example.
docs\design\2026-04-27-bundle-corpus-index-design.md:428:- `docs/guides/session-recording.md`: add a short "Indexing 
FileSink bundles" section.
docs\design\2026-04-27-bundle-corpus-index-design.md:429:- `docs/guides/ai-integration.md`: add Spec 7 as Tier-2 
corpus query surface.
docs\design\2026-04-27-bundle-corpus-index-design.md:430:- `docs/guides/concepts.md`: add `BundleCorpus` to the 
standalone utilities list.
docs\design\2026-04-27-bundle-corpus-index-design.md:431:- `README.md`: Feature Overview row, Public Surface bullet, 
and version badge update.
docs\design\2026-04-27-bundle-corpus-index-design.md:432:- `docs/README.md`: guide index entry.
docs\design\2026-04-27-bundle-corpus-index-design.md:433:- `docs/architecture/ARCHITECTURE.md`: Component Map row and 
Boundaries paragraph for Bundle Corpus.
docs\design\2026-04-27-bundle-corpus-index-design.md:434:- `docs/architecture/drift-log.md`: append a row.
docs\design\2026-04-27-bundle-corpus-index-design.md:435:- `docs/architecture/decisions.md`: append ADRs 28-31.
docs\design\2026-04-27-bundle-corpus-index-design.md:436:- `docs/design/ai-first-dev-roadmap.md`: update Spec 7 status 
when implemented.
docs\design\2026-04-27-bundle-corpus-index-design.md:437:- `docs/changelog.md`, `docs/devlog/summary.md`, latest 
detailed devlog, `package.json`, `src/version.ts`: v0.8.3 additive release entry.
docs\design\2026-04-27-bundle-corpus-index-design.md:439:The implementation plan must include the mandatory doc audit: 
grep or doc-review for stale/removed names and verify canonical docs mention the new API. Stale references in 
historical changelog/devlog/drift-log entries are allowed; current guides, README, and API reference must reflect the 
implementation.
docs\design\2026-04-27-bundle-corpus-index-design.md:441:The code-review prompt must include: "verify docs in the diff 
match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in 
canonical guides."
docs\design\2026-04-27-bundle-corpus-index-design.md:443:## 13. Versioning
docs\design\2026-04-27-bundle-corpus-index-design.md:445:Current base is v0.8.2. Spec 7 v1 is additive and 
non-breaking:
docs\design\2026-04-27-bundle-corpus-index-design.md:447:- New `BundleCorpus` subsystem.
docs\design\2026-04-27-bundle-corpus-index-design.md:448:- New public types and error class.
docs\design\2026-04-27-bundle-corpus-index-design.md:449:- No changes to existing unions.
docs\design\2026-04-27-bundle-corpus-index-design.md:450:- No changes to `FileSink`, `SessionSource`, `SessionBundle`, 
or `runMetrics` signatures.
docs\design\2026-04-27-bundle-corpus-index-design.md:452:Ship as v0.8.3 (`c` bump). One coherent implementation commit 
should include code, tests, docs, ADRs, roadmap status, changelog, devlog, README badge, API reference, doc audit 
evidence, and version bump.
docs\design\2026-04-27-bundle-corpus-index-design.md:454:## 14. ADRs
docs\design\2026-04-27-bundle-corpus-index-design.md:456:### ADR 28: Bundle corpus is manifest-first over closed 
FileSink directories
docs\design\2026-04-27-bundle-corpus-index-design.md:458:**Decision:** v1 builds its in-memory index by scanning 
`manifest.json` files at `BundleCorpus` construction time. It does not write or read a persisted `corpus-index.json`, 
and it is supported only for closed/frozen bundle directories.
docs\design\2026-04-27-bundle-corpus-index-design.md:460:**Rationale:** Manifest scan is simple, deterministic, and 
uses the existing FileSink contract. A secondary database creates invalidation and stale-index risks before the corpus 
size proves it is needed. Active-writer detection would require a new FileSink lifecycle marker or lock contract; v1 
avoids that by making corpus construction a post-generation step. Future cached index or live-writer work can be 
explicit and benchmark-driven.
docs\design\2026-04-27-bundle-corpus-index-design.md:462:### ADR 29: Corpus composes with `runMetrics` via 
`Iterable<SessionBundle>`
docs\design\2026-04-27-bundle-corpus-index-design.md:464:**Decision:** `BundleCorpus` exposes `bundles(query?)` and 
`[Symbol.iterator]()` as synchronous `IterableIterator<SessionBundle>`.
docs\design\2026-04-27-bundle-corpus-index-design.md:466:**Rationale:** Spec 8 already accepts 
`Iterable<SessionBundle>`. Changing `runMetrics` or adding a parallel metrics-specific corpus API would duplicate the 
iteration boundary. Disk-backed corpora should look like any other bundle iterable to metrics code.
docs\design\2026-04-27-bundle-corpus-index-design.md:468:### ADR 30: Canonical corpus order is recordedAt, sessionId, 
key
docs\design\2026-04-27-bundle-corpus-index-design.md:470:**Decision:** Entries are sorted by `metadata.recordedAt`, 
then `metadata.sessionId`, then canonical `key` before any public listing or bundle iteration. The root bundle key is 
`'.'`; descendants use slash-separated relative paths without a leading `./`.
docs\design\2026-04-27-bundle-corpus-index-design.md:472:**Rationale:** Filesystem order differs across platforms. 
Stable ordering makes order-sensitive user metrics deterministic and makes CI output diff-friendly. `key` is the final 
tiebreaker because session IDs can collide when bundles are copied. Defining the root key avoids observable API 
divergence between `'.'`, `''`, and basename encodings.
docs\design\2026-04-27-bundle-corpus-index-design.md:474:### ADR 31: v1 query scope is manifest-derived only
docs\design\2026-04-27-bundle-corpus-index-design.md:476:**Decision:** `BundleQuery` filters only fields present in 
`manifest.json` or derived directly from manifest metadata/attachments. It does not include content-derived 
command/event/marker/snapshot predicates.
docs\design\2026-04-27-bundle-corpus-index-design.md:478:**Rationale:** Content queries over commands, events, ticks, 
markers, snapshots, and metrics require reading larger streams or maintaining a secondary summary index. Mixing that 
into v1 would either violate the lightweight-listing goal or smuggle in a database. Manifest-only query is the minimal 
useful surface that unblocks disk-backed metrics and metadata triage.
docs\design\2026-04-27-bundle-corpus-index-design.md:480:## 15. Open Questions
docs\design\2026-04-27-bundle-corpus-index-design.md:482:1. **Should `recordedAt` query accept `Date` objects?** v1 
uses normalized UTC ISO strings only to keep the query type JSON-clean and timezone-explicit. Callers can pass 
`date.toISOString()`.
docs\design\2026-04-27-bundle-corpus-index-design.md:483:2. **Should `entries()` return an array or an iterator?** v1 
returns `readonly BundleCorpusEntry[]` because the index is already in memory and array filtering/slicing is 
ergonomic. `bundles()` remains a generator to avoid loading full bundles all at once.
docs\design\2026-04-27-bundle-corpus-index-design.md:484:3. **Should BundleCorpus expose content helper methods like 
`markers(query)`?** Deferred. The first content query should be designed with real caller pressure and likely belongs 
to a secondary summary layer.
docs\design\2026-04-27-bundle-corpus-index-design.md:485:4. **Should invalid entries be exposed in strict mode?** 
Strict mode throws immediately, so there is no constructed corpus. `skipInvalid: true` is the diagnostic mode with 
`invalidEntries`.
docs\design\2026-04-27-bundle-corpus-index-design.md:486:5. **Should FileSink add a durable "closed" marker?** 
Deferred. v1 documents the closed-corpus requirement without modifying FileSink. If live-writer mistakes become 
common, a later spec can add explicit lifecycle state to the disk format.
docs\design\2026-04-27-bundle-corpus-index-design.md:488:## 16. Future Specs
docs\design\2026-04-27-bundle-corpus-index-design.md:490:| Future Spec | What it adds |
docs\design\2026-04-27-bundle-corpus-index-design.md:491:| --- | --- |
docs\design\2026-04-27-bundle-corpus-index-design.md:492:| Spec 4: Standalone Bundle Viewer | Uses 
`BundleCorpus.entries()` to populate a bundle picker, then `entry.openSource()` / `SessionReplayer` to inspect 
timelines. |
docs\design\2026-04-27-bundle-corpus-index-design.md:493:| Future: Content Summary Index | Optional derived summaries 
over markers, command/event types, tick failure phases, and metric outputs. Persisted with explicit invalidation. |
docs\design\2026-04-27-bundle-corpus-index-design.md:494:| Future: Async Corpus | `AsyncBundleCorpus` and 
`runMetricsAsync` for remote/object-store or very large local corpora. |
docs\design\2026-04-27-bundle-corpus-index-design.md:495:| Future: Corpus Retention | Delete/archive policies by age, 
source kind, label, failure status, and size. |
docs\design\2026-04-27-bundle-corpus-index-design.md:496:| Future: Live Bundle Discovery | FileSink lifecycle marker 
or lock-file contract so corpus construction can safely exclude active writers. |
docs\design\2026-04-27-bundle-corpus-index-design.md:497:| Future: StopReason Persistence | If Spec 3 persists 
`stopReason` into metadata, BundleQuery can add a manifest-only `stopReason` filter. |
docs\design\2026-04-27-bundle-corpus-index-design.md:499:## 17. Acceptance Criteria
docs\design\2026-04-27-bundle-corpus-index-design.md:501:- `BundleCorpus`, `BundleCorpusScanDepth`, 
`BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, 
`CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, `InvalidCorpusEntry`, and supporting types are exported from 
`src/index.ts`.
docs\design\2026-04-27-bundle-corpus-index-design.md:502:- Corpus construction discovers closed FileSink bundle 
directories from a root, validates manifests, skips symlinks, honors `scanDepth`, derives `'.'` for a root-bundle key, 
and exposes stable sorted entries.
docs\design\2026-04-27-bundle-corpus-index-design.md:503:- `entries(query?)` filters without reading JSONL streams, 
snapshots, or sidecar bytes.
docs\design\2026-04-27-bundle-corpus-index-design.md:504:- Query validation rejects invalid numeric ranges and 
non-normalized `recordedAt` bounds.
docs\design\2026-04-27-bundle-corpus-index-design.md:505:- Optional manifest-field filters have defined missing-value 
behavior.
docs\design\2026-04-27-bundle-corpus-index-design.md:506:- `attachmentMime` any-match behavior is covered by a 
multi-attachment test.
docs\design\2026-04-27-bundle-corpus-index-design.md:507:- `bundles(query?)` and `[Symbol.iterator]` yield full 
`SessionBundle`s lazily, one entry at a time, via FileSink.
docs\design\2026-04-27-bundle-corpus-index-design.md:508:- `entry.openSource()` and `entry.loadBundle()` compose with 
`SessionReplayer` and `FileSink.toBundle()`.
docs\design\2026-04-27-bundle-corpus-index-design.md:509:- `corpus.get(key)` returns `undefined`, while 
`corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'` 
for missing keys.
docs\design\2026-04-27-bundle-corpus-index-design.md:510:- `runMetrics(corpus.bundles(query), metrics)` works and is 
covered by tests.
docs\design\2026-04-27-bundle-corpus-index-design.md:511:- Invalid manifest handling has strict and `skipInvalid` 
coverage, including non-canonical `metadata.recordedAt`.
docs\design\2026-04-27-bundle-corpus-index-design.md:512:- Incomplete-bundle `materializedEndTick` behavior is covered 
and documented as a manifest materialization horizon, not as a replay guarantee.
docs\design\2026-04-27-bundle-corpus-index-design.md:513:- Explicit dataUrl attachment bytes embedded in 
`manifest.json` are documented as part of manifest parse cost, not as a separate content index.
docs\design\2026-04-27-bundle-corpus-index-design.md:514:- Sidecar-byte integrity is documented and tested as 
source-level/on-demand, not `loadBundle()` validation.
docs\design\2026-04-27-bundle-corpus-index-design.md:515:- Defensive metadata freezing/copying is covered by tests.
docs\design\2026-04-27-bundle-corpus-index-design.md:516:- Docs, ADRs, roadmap, changelog, devlog, README badge, API 
reference, doc audit evidence, and version bump land in the same commit as code.
docs\design\2026-04-27-bundle-corpus-index-design.md:517:- All four engine gates pass: `npm test`, `npm run 
typecheck`, `npm run lint`, `npm run build`.
docs\design\2026-04-27-bundle-corpus-index-design.md:518:- Multi-CLI design, plan, and code reviews converge per 
AGENTS.md.
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:21:30.497575Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:21:30.498074Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'attachmentMime|multi-attachment|dataUrl|SessionReplayer|stopReason|closed-corpus|root_missing|schema_unsupported|manifest_parse|invalidEntries|duplicate_key|recordedAt.from|policySeed|OneOrMany|export type OneOrMany'" in C:\Users\38909\Documents\github\civ-engine
2026-04-28T01:21:47.070074Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-file-sink.ts,src\\session-sink.ts,src\\session-bundle.ts,src\\index.ts,src\\behavioral-metrics.ts -Pattern 'attachments\\(\\)|toBundle\\(|writeAttachment\\(|sourceKind|policySeed|SESSION_BUNDLE_SCHEMA_VERSION|SessionSource|runMetrics|bundleCount|toBundle\\(\\): SessionBundle'"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-file-sink.ts,src\\session-sink.ts,src\\session-bundle.ts,src\\index.ts,src\\behavioral-metrics.ts -Pattern 'attachments\\(\\)|toBundle\\(|writeAttachment\\(|sourceKind|policySeed|SESSION_BUNDLE_SCHEMA_VERSION|SessionSource|runMetrics|bundleCount|toBundle\\(\\): SessionBundle'" in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-file-sink.ts,src\\session-sink.ts,src\\session-bundle.ts,src\\index.ts,src\\behavioral-metrics.ts -Pattern 'attachments\\(\\)|toBundle\\(|writeAttachment\\(|sourceKind|policySeed|SESSION_BUNDLE_SCHEMA_VERSION|SessionSource|runMetrics|bundleCount|toBundle\\(\\): SessionBundle'"` rejected: blocked by policy
 succeeded in 486ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:9:**Architecture:** Add one focused module, 
`src/bundle-corpus.ts`, that owns filesystem discovery, manifest validation, immutable entry construction, query 
validation/filtering, and FileSink-backed bundle/source loading. The new module composes with existing session 
recording, FileSink, SessionReplayer, and behavioral metrics without changing their signatures.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:28:- Create `docs/guides/bundle-corpus-index.md`: 
quickstart, query guide, metrics integration, replay investigation, scan depth, closed-corpus and sidecar boundaries.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:215:    const entry = corpus.entries({ 
attachmentMime: 'image/png' })[0];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:218:    
expect(entry.attachmentMimes).toEqual(['image/png']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:229:      policySeed: 42,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:243:    expect(corpus.entries({ sourceKind: 
'synthetic', policySeed: { min: 40, max: 50 } }).map((entry) => entry.key)).toEqual(['seeded']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:274:    expectCorpusError(() => corpus.entries({ 
policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:300:    
expect(corpus.invalidEntries).toHaveLength(1);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:301:    
expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:323:- [ ] Create `src/bundle-corpus.ts` with the 
public API and helpers below. Keep the module self-contained; do not modify FileSink, SessionSource, SessionBundle, 
SessionReplayer, or runMetrics.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:354:type OneOrMany<T> = T | readonly T[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:358:  sessionId?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:359:  sourceKind?: 
OneOrMany<SessionMetadata['sourceKind']>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:360:  sourceLabel?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:361:  engineVersion?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:362:  nodeVersion?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:370:  policySeed?: number | NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:372:  attachmentMime?: OneOrMany<string>;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:376:  | 'root_missing'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:377:  | 'manifest_parse'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:379:  | 'schema_unsupported'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:380:  | 'duplicate_key'
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:414:  readonly attachmentMimes: readonly string[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:516:  if (value.policySeed !== undefined) 
metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:530:    (refKeys.length === 1 && typeof ref.dataUrl 
=== 'string') ||
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:534:    throw corpusError(`attachments[${index}].ref 
must be dataUrl, sidecar, or auto`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:549:    throw corpusError(`manifest parse failed: 
${(error as Error).message}`, { code: 'manifest_parse', path: manifestPath, message: (error as Error).message });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:555:    throw corpusError('unsupported bundle schema 
version', { code: 'schema_unsupported', path: manifestPath, message: String(parsed.schemaVersion) });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:573:  readonly invalidEntries: readonly 
InvalidCorpusEntry[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:580:      throw corpusError('corpus root is missing 
or is not a directory', { code: 'root_missing', path: root });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:583:    const invalidEntries: InvalidCorpusEntry[] = 
[];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:591:        throw corpusError(`duplicate corpus key 
${key}`, { code: 'duplicate_key', path: dir, key });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:598:        if (options.skipInvalid && error 
instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:599:          invalidEntries.push(Object.freeze({ 
path: join(dir, MANIFEST_FILE), error }));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:609:    this.invalidEntries = 
Object.freeze(invalidEntries.slice());
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:676:  const attachmentMimes = Object.freeze([...new 
Set(manifest.attachments.map((attachment) => attachment.mime))].sort((a, b) => a.localeCompare(b)));
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:685:    attachmentMimes,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:714:- [ ] Implement `compileQuery(query)` with 
inclusive numeric ranges, one-or-many matching, optional-field exclusion, `attachmentMime` any-match, canonical 
`recordedAt` bounds, and AND semantics.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:717:function asArray<T>(value: OneOrMany<T>): 
readonly T[] {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:743:function matchesOne<T>(value: T | undefined, 
expected: OneOrMany<T> | undefined): boolean {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:757:    policySeed: typeof query.policySeed === 
'object' ? assertNumberRange(query.policySeed, 'policySeed') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:759:  const policySeedScalar = typeof 
query.policySeed === 'number' ? assertQueryInteger(query.policySeed, 'policySeed') : undefined;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:760:  const recordedAtFrom = query.recordedAt?.from 
=== undefined ? undefined : validateQueryIso(query.recordedAt.from, 'recordedAt.from');
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:763:    throw corpusError('recordedAt.from must be 
<= recordedAt.to', { code: 'query_invalid', message: 'recordedAt' });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:781:    if (policySeedScalar !== undefined && 
m.policySeed !== policySeedScalar) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:782:    if (ranges.policySeed && (m.policySeed === 
undefined || !matchesRange(m.policySeed, ranges.policySeed))) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:785:    if (query.attachmentMime && 
!entry.attachmentMimes.some((mime) => asArray(query.attachmentMime!).includes(mime))) return false;
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:21:47.647096Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:21:47.647640Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-file-sink.ts -Pattern 'toBundle|writeAttachment|attachments|readSidecar'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-sink.ts -Pattern 'toBundle|attachments|readSidecar|SessionSource'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-bundle.ts -Pattern 'sourceKind|policySeed|SessionMetadata|AttachmentDescriptor'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\index.ts -Pattern 'FileSink|runMetrics|bundleCount|SessionSource'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 459ms:
System.Management.Automation.RemoteException
src\session-file-sink.ts:27:const ATTACHMENTS_DIR = 'attachments';
src\session-file-sink.ts:30: * Map a MIME type to a file extension for sidecar attachments. Falls back
src\session-file-sink.ts:54:  attachments: AttachmentDescriptor[];
src\session-file-sink.ts:62: *   manifest.json                      # SessionMetadata + dataUrl attachments + sidecar 
refs
src\session-file-sink.ts:69: *   attachments/<id>.<ext>             # sidecar bytes
src\session-file-sink.ts:85:  private readonly _attachments: AttachmentDescriptor[] = [];
src\session-file-sink.ts:91:    // load metadata + attachments from it so the FileSink can be used as
src\session-file-sink.ts:93:    // call `toBundle()` / `readSnapshot()` / `readSidecar()` directly.
src\session-file-sink.ts:102:          this._attachments.push(...manifest.attachments);
src\session-file-sink.ts:128:    if (!existsSync(join(this._dir, ATTACHMENTS_DIR))) {
src\session-file-sink.ts:129:      mkdirSync(join(this._dir, ATTACHMENTS_DIR), { recursive: true });
src\session-file-sink.ts:140:    this._attachments.length = 0;
src\session-file-sink.ts:158:      attachments: this._attachments.slice(),
src\session-file-sink.ts:261:  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): 
AttachmentDescriptor {
src\session-file-sink.ts:276:      const path = join(this._dir, ATTACHMENTS_DIR, `${descriptor.id}${ext}`);
src\session-file-sink.ts:289:    this._attachments.push(final);
src\session-file-sink.ts:320:  readSidecar(id: string): Uint8Array {
src\session-file-sink.ts:321:    const desc = this._attachments.find((a) => a.id === id);
src\session-file-sink.ts:323:      throw new SinkWriteError(`sidecar ${id} not found in attachments index`, {
src\session-file-sink.ts:333:    const path = join(this._dir, ATTACHMENTS_DIR, `${id}${ext}`);
src\session-file-sink.ts:358:  *attachments(): IterableIterator<AttachmentDescriptor> {
src\session-file-sink.ts:359:    for (const a of this._attachments) yield a;
src\session-file-sink.ts:362:  toBundle(): SessionBundle {
src\session-file-sink.ts:396:      attachments: this._attachments.slice(),
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 557ms:
System.Management.Automation.RemoteException
src\session-sink.ts:44: * implement the union (`SessionSink & SessionSource`). The `SessionReplayer`
src\session-sink.ts:45: * (T6) consumes a `SessionSource` to rehydrate bundle data lazily.
src\session-sink.ts:47:export interface SessionSource {
src\session-sink.ts:50:  readSidecar(id: string): Uint8Array;
src\session-sink.ts:56:  attachments(): IterableIterator<AttachmentDescriptor>;
src\session-sink.ts:58:  toBundle(): SessionBundle;
src\session-sink.ts:65:   * Allow attachments larger than `sidecarThresholdBytes` to be stored as
src\session-sink.ts:67:   * `readSidecar(id)`). Default `false` - oversize attachments throw
src\session-sink.ts:73:   * Threshold for the dataUrl-vs-sidecar default decision. Attachments at or
src\session-sink.ts:81: * In-memory `SessionSink & SessionSource`. Holds writes in arrays and an
src\session-sink.ts:82: * attachment map; `toBundle()` returns a strict-JSON `SessionBundle`
src\session-sink.ts:85:export class MemorySink implements SessionSink, SessionSource {
src\session-sink.ts:93:  private readonly _attachments: AttachmentDescriptor[] = [];
src\session-sink.ts:198:    this._attachments.push(final);
src\session-sink.ts:207:  // --- SessionSource ---
src\session-sink.ts:217:  readSidecar(id: string): Uint8Array {
src\session-sink.ts:230:  *attachments(): IterableIterator<AttachmentDescriptor> { for (const a of this._attachments) 
yield a; }
src\session-sink.ts:232:  toBundle(): SessionBundle {
src\session-sink.ts:246:    // variance. Consumers reading via SessionSource get the runtime shape
src\session-sink.ts:258:      attachments: this._attachments.slice(),
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 635ms:
System.Management.Automation.RemoteException
src\session-bundle.ts:65:export interface AttachmentDescriptor {
src\session-bundle.ts:83:export interface SessionMetadata {
src\session-bundle.ts:97:  sourceKind: 'session' | 'scenario' | 'synthetic';
src\session-bundle.ts:102:   * Populated only when sourceKind === 'synthetic'. The seed used for the
src\session-bundle.ts:106:  policySeed?: number;
src\session-bundle.ts:115:  metadata: SessionMetadata;
src\session-bundle.ts:123:  attachments: AttachmentDescriptor[];
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 717ms:
System.Management.Automation.RemoteException
src\index.ts:56:  type SessionSource,
src\index.ts:60:// T3: FileSink
src\index.ts:61:export { FileSink } from './session-file-sink.js';
src\index.ts:98:  runMetrics,
src\index.ts:100:  bundleCount,
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:21:55.280915Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:21:55.281415Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | Select-Object -Skip 190 -First 120" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | Select-Object -Skip 500 -First 130" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | Select-Object -Skip 714 -First 90" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 477ms:
- [ ] Add manifest-only, sidecar, query, missing-key, invalid-manifest, FileSink, and metrics tests.
System.Management.Automation.RemoteException
```ts
describe('BundleCorpus query and loading contracts', () => {
  it('lists from manifest without reading malformed streams until loadBundle', () => {
    const root = tempRoot();
    const dir = join(root, 'bad-stream');
    writeBundle(dir, metadata('bad-stream'));
    writeFileSync(join(dir, 'ticks.jsonl'), '{"tick":\n{}\n');
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['bad-stream']);
    expect(() => corpus.loadBundle('bad-stream')).toThrow();
  });
System.Management.Automation.RemoteException
  it('does not read missing sidecar bytes during listing or loadBundle', () => {
    const root = tempRoot();
    const dir = join(root, 'sidecar');
    writeBundle(dir, metadata('sidecar'), [
      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
    ]);
    rmSync(join(dir, 'attachments', 'screen.png'));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    const entry = corpus.entries({ attachmentMime: 'image/png' })[0];
    expect(entry.attachmentCount).toBe(1);
    expect(entry.attachmentBytes).toBe(3);
    expect(entry.attachmentMimes).toEqual(['image/png']);
    expect(entry.loadBundle().attachments).toHaveLength(1);
    expect(() => entry.openSource().readSidecar('screen')).toThrow();
  });
System.Management.Automation.RemoteException
  it('filters by manifest fields and ANDs query fields', () => {
    const root = tempRoot();
    writeBundle(join(root, 'seeded'), metadata('seeded', {
      recordedAt: '2026-04-27T00:00:01.000Z',
      sourceKind: 'synthetic',
      sourceLabel: 'random',
      policySeed: 42,
      durationTicks: 30,
      endTick: 30,
      persistedEndTick: 30,
    }));
    writeBundle(join(root, 'unseeded'), metadata('unseeded', {
      recordedAt: '2026-04-27T00:00:02.000Z',
      sourceKind: 'synthetic',
      durationTicks: 5,
      endTick: 5,
      persistedEndTick: 5,
    }));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.entries({ sourceKind: 'synthetic', policySeed: { min: 40, max: 50 } }).map((entry) => entry.key)).toEqual(['seeded']);
    expect(corpus.entries({ sourceLabel: 'random' }).map((entry) => entry.key)).toEqual(['seeded']);
    expect(corpus.entries({ durationTicks: { min: 10 }, recordedAt: { from: '2026-04-27T00:00:00.000Z', to: '2026-04-27T00:00:01.000Z' } }).map((entry) => entry.key)).toEqual(['seeded']);
    expect(corpus.entries({ key: /seed/ }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
  });
System.Management.Automation.RemoteException
  it('derives failure counts and materializedEndTick from metadata', () => {
    const root = tempRoot();
    writeBundle(join(root, 'complete'), metadata('complete', { endTick: 20, persistedEndTick: 20, durationTicks: 20 }));
    writeBundle(join(root, 'incomplete'), metadata('incomplete', {
      incomplete: true,
      endTick: 50,
      persistedEndTick: 25,
      durationTicks: 50,
      failedTicks: [26, 27],
    }));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.get('complete')?.materializedEndTick).toBe(20);
    expect(corpus.get('incomplete')?.materializedEndTick).toBe(25);
    expect(corpus.entries({ materializedEndTick: { max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
    expect(corpus.entries({ endTick: { min: 50 } }).map((entry) => entry.key)).toEqual(['incomplete']);
  });
System.Management.Automation.RemoteException
  it('rejects invalid query ranges and non-canonical recordedAt bounds', () => {
    const root = tempRoot();
    writeBundle(join(root, 'bundle'), metadata('bundle'));
    const corpus = new BundleCorpus(root);
System.Management.Automation.RemoteException
    expectCorpusError(() => corpus.entries({ durationTicks: { min: 10, max: 1 } }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ startTick: { min: 0.5 } }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ recordedAt: { from: '2026-04-27' } }), 'query_invalid');
  });
System.Management.Automation.RemoteException
  it('returns undefined for get and throws entry_missing for strict missing-key APIs', () => {
    const root = tempRoot();
    writeBundle(join(root, 'bundle'), metadata('bundle'));
    const corpus = new BundleCorpus(root);
System.Management.Automation.RemoteException
    expect(corpus.get('missing')).toBeUndefined();
    expectCorpusError(() => corpus.openSource('missing'), 'entry_missing');
    expectCorpusError(() => corpus.loadBundle('missing'), 'entry_missing');
  });
System.Management.Automation.RemoteException
  it('handles invalid manifests strictly or through skipInvalid diagnostics', () => {
    const root = tempRoot();
    writeBundle(join(root, 'good'), metadata('good'));
    writeInvalidManifest(join(root, 'bad'), {
      schemaVersion: 1,
      metadata: metadata('bad', { recordedAt: '2026-04-27T00:00:00-07:00' }),
      attachments: [],
    });
System.Management.Automation.RemoteException
    expectCorpusError(() => new BundleCorpus(root), 'manifest_invalid');
    const corpus = new BundleCorpus(root, { skipInvalid: true });
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['good']);
    expect(corpus.invalidEntries).toHaveLength(1);
    expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
  });
System.Management.Automation.RemoteException
  it('loads FileSink bundles lazily and composes with runMetrics', () => {
    const root = tempRoot();
    writeBundle(join(root, 'one'), metadata('one', { recordedAt: '2026-04-27T00:00:01.000Z' }));
    writeBundle(join(root, 'two'), metadata('two', { recordedAt: '2026-04-27T00:00:02.000Z', sourceKind: 'synthetic' }));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.openSource('one').readSnapshot(0)).toEqual(snapshot(0).snapshot);
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 567ms:
    recordedAt: assertCanonicalIso(value.recordedAt, 'recordedAt', path),
    startTick: assertInteger(value.startTick, 'startTick', path),
    endTick: assertInteger(value.endTick, 'endTick', path),
    persistedEndTick: assertInteger(value.persistedEndTick, 'persistedEndTick', path),
    durationTicks: assertInteger(value.durationTicks, 'durationTicks', path),
    sourceKind,
  };
  if (value.sourceLabel !== undefined) metadata.sourceLabel = assertString(value.sourceLabel, 'sourceLabel', path);
  if (value.incomplete !== undefined) {
    if (value.incomplete !== true) {
      throw corpusError('metadata.incomplete must be true when present', { code: 'manifest_invalid', path, message: 'incomplete' });
    }
    metadata.incomplete = true;
  }
  if (failedTicks) metadata.failedTicks = failedTicks;
  if (value.policySeed !== undefined) metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
  return metadata;
}
System.Management.Automation.RemoteException
function validateAttachment(value: unknown, path: string, index: number): AttachmentDescriptor {
  if (!isRecord(value)) {
    throw corpusError(`attachments[${index}] must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}]` });
  }
  const ref = value.ref;
  if (!isRecord(ref)) {
    throw corpusError(`attachments[${index}].ref must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
  }
  const refKeys = Object.keys(ref).filter((key) => ref[key] !== undefined);
  const validRef =
    (refKeys.length === 1 && typeof ref.dataUrl === 'string') ||
    (refKeys.length === 1 && ref.sidecar === true) ||
    (refKeys.length === 1 && ref.auto === true);
  if (!validRef) {
    throw corpusError(`attachments[${index}].ref must be dataUrl, sidecar, or auto`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
  }
  return {
    id: assertString(value.id, `attachments[${index}].id`, path),
    mime: assertString(value.mime, `attachments[${index}].mime`, path),
    sizeBytes: assertInteger(value.sizeBytes, `attachments[${index}].sizeBytes`, path),
    ref: ref as AttachmentDescriptor['ref'],
  };
}
System.Management.Automation.RemoteException
function readManifest(manifestPath: string): FileManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf-8')) as unknown;
  } catch (error) {
    throw corpusError(`manifest parse failed: ${(error as Error).message}`, { code: 'manifest_parse', path: manifestPath, message: (error as Error).message });
  }
  if (!isRecord(parsed)) {
    throw corpusError('manifest must be an object', { code: 'manifest_invalid', path: manifestPath, message: 'manifest' });
  }
  if (parsed.schemaVersion !== SESSION_BUNDLE_SCHEMA_VERSION) {
    throw corpusError('unsupported bundle schema version', { code: 'schema_unsupported', path: manifestPath, message: String(parsed.schemaVersion) });
  }
  if (!Array.isArray(parsed.attachments)) {
    throw corpusError('manifest attachments must be an array', { code: 'manifest_invalid', path: manifestPath, message: 'attachments' });
  }
  return {
    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
    metadata: validateMetadata(parsed.metadata, manifestPath),
    attachments: parsed.attachments.map((attachment, index) => validateAttachment(attachment, manifestPath, index)),
  };
}
```
System.Management.Automation.RemoteException
- [ ] Add `BundleCorpus` with synchronous construction, deterministic discovery, immutable entries, query filtering, and lazy bundle iteration.
System.Management.Automation.RemoteException
```ts
export class BundleCorpus implements Iterable<SessionBundle> {
  readonly rootDir: string;
  readonly invalidEntries: readonly InvalidCorpusEntry[];
  private readonly _entries: readonly BundleCorpusEntry[];
  private readonly _byKey: ReadonlyMap<string, BundleCorpusEntry>;
System.Management.Automation.RemoteException
  constructor(rootDir: string, options: BundleCorpusOptions = {}) {
    const root = resolve(rootDir);
    if (!existsSync(root) || !lstatSync(root).isDirectory()) {
      throw corpusError('corpus root is missing or is not a directory', { code: 'root_missing', path: root });
    }
    this.rootDir = realpathSync(root);
    const invalidEntries: InvalidCorpusEntry[] = [];
    const found = discoverBundleDirs(this.rootDir, options.scanDepth ?? 'all');
    const byKey = new Map<string, BundleCorpusEntry>();
    const entries: BundleCorpusEntry[] = [];
System.Management.Automation.RemoteException
    for (const dir of found) {
      const key = keyForDir(this.rootDir, dir);
      if (byKey.has(key)) {
        throw corpusError(`duplicate corpus key ${key}`, { code: 'duplicate_key', path: dir, key });
      }
      try {
        const entry = makeEntry(dir, key, readManifest(join(dir, MANIFEST_FILE)));
        byKey.set(key, entry);
        entries.push(entry);
      } catch (error) {
        if (options.skipInvalid && error instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
          invalidEntries.push(Object.freeze({ path: join(dir, MANIFEST_FILE), error }));
          continue;
        }
        throw error;
      }
    }
System.Management.Automation.RemoteException
    entries.sort(compareEntries);
    this._entries = Object.freeze(entries.slice());
    this._byKey = new Map(entries.map((entry) => [entry.key, entry]));
    this.invalidEntries = Object.freeze(invalidEntries.slice());
  }
System.Management.Automation.RemoteException
  entries(query?: BundleQuery): readonly BundleCorpusEntry[] {
    const predicate = query ? compileQuery(query) : () => true;
    return Object.freeze(this._entries.filter(predicate));
  }
System.Management.Automation.RemoteException
  *bundles(query?: BundleQuery): IterableIterator<SessionBundle> {
    for (const entry of this.entries(query)) {
      yield entry.loadBundle();
    }
  }
System.Management.Automation.RemoteException
  get(key: string): BundleCorpusEntry | undefined {
    return this._byKey.get(key);
  }
System.Management.Automation.RemoteException
  openSource(key: string): SessionSource {
    return requireEntry(this._byKey, key).openSource();
  }
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 642ms:
System.Management.Automation.RemoteException
```ts
function asArray<T>(value: OneOrMany<T>): readonly T[] {
  return Array.isArray(value) ? value : [value];
}
System.Management.Automation.RemoteException
function assertQueryInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw corpusError(`${label} must be a finite integer`, { code: 'query_invalid', message: label });
  }
  return value;
}
System.Management.Automation.RemoteException
function assertNumberRange(range: NumberRange, label: string): Required<NumberRange> {
  if (range.min !== undefined) assertQueryInteger(range.min, `${label}.min`);
  if (range.max !== undefined) assertQueryInteger(range.max, `${label}.max`);
  const min = range.min ?? Number.NEGATIVE_INFINITY;
  const max = range.max ?? Number.POSITIVE_INFINITY;
  if (min > max) {
    throw corpusError(`${label}.min must be <= max`, { code: 'query_invalid', message: label });
  }
  return { min, max };
}
System.Management.Automation.RemoteException
function matchesRange(value: number, range: Required<NumberRange>): boolean {
  return value >= range.min && value <= range.max;
}
System.Management.Automation.RemoteException
function matchesOne<T>(value: T | undefined, expected: OneOrMany<T> | undefined): boolean {
  if (expected === undefined) return true;
  if (value === undefined) return false;
  return asArray(expected).includes(value);
}
System.Management.Automation.RemoteException
function compileQuery(query: BundleQuery): (entry: BundleCorpusEntry) => boolean {
  const ranges = {
    durationTicks: query.durationTicks ? assertNumberRange(query.durationTicks, 'durationTicks') : undefined,
    startTick: query.startTick ? assertNumberRange(query.startTick, 'startTick') : undefined,
    endTick: query.endTick ? assertNumberRange(query.endTick, 'endTick') : undefined,
    persistedEndTick: query.persistedEndTick ? assertNumberRange(query.persistedEndTick, 'persistedEndTick') : undefined,
    materializedEndTick: query.materializedEndTick ? assertNumberRange(query.materializedEndTick, 'materializedEndTick') : undefined,
    failedTickCount: query.failedTickCount ? assertNumberRange(query.failedTickCount, 'failedTickCount') : undefined,
    policySeed: typeof query.policySeed === 'object' ? assertNumberRange(query.policySeed, 'policySeed') : undefined,
  };
  const policySeedScalar = typeof query.policySeed === 'number' ? assertQueryInteger(query.policySeed, 'policySeed') : undefined;
  const recordedAtFrom = query.recordedAt?.from === undefined ? undefined : validateQueryIso(query.recordedAt.from, 'recordedAt.from');
  const recordedAtTo = query.recordedAt?.to === undefined ? undefined : validateQueryIso(query.recordedAt.to, 'recordedAt.to');
  if (recordedAtFrom && recordedAtTo && recordedAtFrom > recordedAtTo) {
    throw corpusError('recordedAt.from must be <= recordedAt.to', { code: 'query_invalid', message: 'recordedAt' });
  }
System.Management.Automation.RemoteException
  return (entry) => {
    const m = entry.metadata;
    if (query.key instanceof RegExp ? !query.key.test(entry.key) : query.key !== undefined && entry.key !== query.key) return false;
    if (!matchesOne(m.sessionId, query.sessionId)) return false;
    if (!matchesOne(m.sourceKind, query.sourceKind)) return false;
    if (!matchesOne(m.sourceLabel, query.sourceLabel)) return false;
    if (!matchesOne(m.engineVersion, query.engineVersion)) return false;
    if (!matchesOne(m.nodeVersion, query.nodeVersion)) return false;
    if (query.incomplete !== undefined && (m.incomplete === true) !== query.incomplete) return false;
    if (ranges.durationTicks && !matchesRange(m.durationTicks, ranges.durationTicks)) return false;
    if (ranges.startTick && !matchesRange(m.startTick, ranges.startTick)) return false;
    if (ranges.endTick && !matchesRange(m.endTick, ranges.endTick)) return false;
    if (ranges.persistedEndTick && !matchesRange(m.persistedEndTick, ranges.persistedEndTick)) return false;
    if (ranges.materializedEndTick && !matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
    if (ranges.failedTickCount && !matchesRange(entry.failedTickCount, ranges.failedTickCount)) return false;
    if (policySeedScalar !== undefined && m.policySeed !== policySeedScalar) return false;
    if (ranges.policySeed && (m.policySeed === undefined || !matchesRange(m.policySeed, ranges.policySeed))) return false;
    if (recordedAtFrom && m.recordedAt < recordedAtFrom) return false;
    if (recordedAtTo && m.recordedAt > recordedAtTo) return false;
    if (query.attachmentMime && !entry.attachmentMimes.some((mime) => asArray(query.attachmentMime!).includes(mime))) return false;
    return true;
  };
}
```
System.Management.Automation.RemoteException
- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: tests compile, then failures point to any mismatch between test names and implementation details rather than missing exports.
System.Management.Automation.RemoteException
### Step 3: Export the public surface
System.Management.Automation.RemoteException
- [ ] Modify `src/index.ts` by adding this export block after the FileSink export and before SessionRecorder:
System.Management.Automation.RemoteException
```ts
// Bundle Corpus Index - Spec 7 (v0.8.3+): manifest-first query/index layer
// over closed FileSink bundle directories, with lazy SessionBundle loading.
export {
  BundleCorpus,
  CorpusIndexError,
  type BundleCorpusScanDepth,
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:22:03.222418Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:22:03.222901Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | Select-Object -Skip 300 -First 30" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 458ms:
    expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
  });
System.Management.Automation.RemoteException
  it('loads FileSink bundles lazily and composes with runMetrics', () => {
    const root = tempRoot();
    writeBundle(join(root, 'one'), metadata('one', { recordedAt: '2026-04-27T00:00:01.000Z' }));
    writeBundle(join(root, 'two'), metadata('two', { recordedAt: '2026-04-27T00:00:02.000Z', sourceKind: 'synthetic' }));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.openSource('one').readSnapshot(0)).toEqual(snapshot(0).snapshot);
    expect(corpus.loadBundle('one')).toEqual(new FileSink(join(root, 'one')).toBundle());
    expect([...corpus].map((bundle) => bundle.metadata.sessionId)).toEqual(['one', 'two']);
    expect(runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()]).bundleCount).toBe(1);
  });
});
```
System.Management.Automation.RemoteException
- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: FAIL with module/export errors for `BundleCorpus` and `CorpusIndexError`.
System.Management.Automation.RemoteException
### Step 2: Implement `src/bundle-corpus.ts`
System.Management.Automation.RemoteException
- [ ] Create `src/bundle-corpus.ts` with the public API and helpers below. Keep the module self-contained; do not modify FileSink, SessionSource, SessionBundle, SessionReplayer, or runMetrics.
System.Management.Automation.RemoteException
```ts
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { JsonValue } from './json.js';
import type { AttachmentDescriptor, SessionBundle, SessionMetadata } from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:22:08.606443Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:22:08.606991Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
web search: 
web search: 
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-design.md -Pattern 'auto|dataUrl|sidecar'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 480ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-design.md:17:- Lists and filters corpus entries without reading JSONL 
streams, snapshots, sidecar bytes, commands, ticks, events, or markers.
docs\design\2026-04-27-bundle-corpus-index-design.md:27:- **Content indexing in v1.** Queries over `commands.jsonl`, 
`ticks.jsonl`, events, markers, snapshots, sidecar attachment bytes, or metric outputs are out of scope. v1 query 
predicates are manifest-derived only. Explicit dataUrl attachments can still place bytes inside `manifest.json`; v1 
reads those only as part of manifest parsing, not as a separate content index.
docs\design\2026-04-27-bundle-corpus-index-design.md:54:`manifest.json` is the natural v1 index unit because it 
contains `schemaVersion`, `metadata`, and attachments. It is atomically rewritten at `open()`, successful snapshot 
writes, and `close()`. Reading manifests is cheap and does not force loading streams, snapshots, or sidecar bytes. 
FileSink defaults to sidecar attachments, but explicit dataUrl attachments embed bytes in the manifest and therefore 
increase manifest parse cost.
docs\design\2026-04-27-bundle-corpus-index-design.md:255:Default construction is strict: invalid manifests throw. With 
`skipInvalid: true`, invalid manifests are collected in `invalidEntries`, omitted from `entries()`, and do not affect 
iteration. Full bundle load failures from malformed JSONL or missing snapshots are not swallowed; they surface when 
`loadBundle()` or `bundles()` reaches that entry. Sidecar-byte integrity is different: `FileSink.toBundle()` does not 
read sidecar payloads, so missing sidecar bytes surface only when a caller dereferences them through 
`SessionSource.readSidecar(id)` or equivalent source-level access.
docs\design\2026-04-27-bundle-corpus-index-design.md:297:Spec 7 composes with FileSink's existing format. It does not 
add files to a bundle directory and does not require FileSink to write index-specific sidecars.
docs\design\2026-04-27-bundle-corpus-index-design.md:301:The manifest may contain dataUrl attachment bytes when a 
caller explicitly opted into manifest embedding. `BundleCorpus` still treats those as manifest bytes: it parses 
descriptors and derives MIME/count/size metadata, but it does not decode, inspect, or index the embedded payload.
docs\design\2026-04-27-bundle-corpus-index-design.md:389:Construction cost is O(number of directories visited + number 
of manifests). No JSONL streams, snapshot files, or sidecar bytes are read during construction or `entries()`. Each 
manifest parse is usually small and bounded by metadata plus attachment descriptors because FileSink defaults 
attachments to sidecars; explicit dataUrl attachments are embedded in `manifest.json` and can make manifest parsing 
larger.
docs\design\2026-04-27-bundle-corpus-index-design.md:405:- **Sidecar boundary:** a bundle with a manifest-sidecar 
descriptor but missing sidecar bytes can still be listed and loaded as a `SessionBundle`; the missing bytes surface 
only when `readSidecar(id)` is called on the opened source.
docs\design\2026-04-27-bundle-corpus-index-design.md:414:- **FileSink integration:** `entry.openSource()` reads 
snapshots and sidecars through FileSink; `entry.loadBundle()` matches `new FileSink(dir).toBundle()` for full bundle 
materialization.
docs\design\2026-04-27-bundle-corpus-index-design.md:419:Tests should create real temporary FileSink bundle 
directories, not hand-written partial shapes except for malformed-manifest, malformed-stream, and sidecar-boundary 
cases.
docs\design\2026-04-27-bundle-corpus-index-design.md:426:- `docs/guides/bundle-corpus-index.md`: quickstart, metadata 
query guide, `runMetrics` integration, replay investigation example, closed-corpus contract, incomplete-bundle 
behavior, sidecar boundary, scan-depth behavior, limitations.
docs\design\2026-04-27-bundle-corpus-index-design.md:503:- `entries(query?)` filters without reading JSONL streams, 
snapshots, or sidecar bytes.
docs\design\2026-04-27-bundle-corpus-index-design.md:513:- Explicit dataUrl attachment bytes embedded in 
`manifest.json` are documented as part of manifest parse cost, not as a separate content index.
docs\design\2026-04-27-bundle-corpus-index-design.md:514:- Sidecar-byte integrity is documented and tested as 
source-level/on-demand, not `loadBundle()` validation.
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:22:34.824847Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:22:34.825438Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content tsconfig.build.json' in C:\Users\38909\Documents\github\civ-engine
 succeeded in 401ms:
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "noEmit": false,
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["dist", "tests"]
}
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:23:31.742799Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:23:31.743353Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content src\\json.ts" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 427ms:
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
System.Management.Automation.RemoteException
export function assertJsonCompatible(value: unknown, label = 'value'): void {
  const seen = new WeakSet<object>();
System.Management.Automation.RemoteException
  function visit(current: unknown, path: string): void {
    if (current === null) return;
System.Management.Automation.RemoteException
    const type = typeof current;
    if (type === 'string' || type === 'boolean') return;
    if (type === 'number') {
      if (!Number.isFinite(current)) {
        throw new Error(`${path} must be a finite JSON number`);
      }
      return;
    }
    if (type === 'undefined') {
      throw new Error(`${path} must not be undefined`);
    }
    if (type === 'bigint' || type === 'function' || type === 'symbol') {
      throw new Error(`${path} is not JSON-compatible`);
    }
    if (type !== 'object') {
      throw new Error(`${path} is not JSON-compatible`);
    }
System.Management.Automation.RemoteException
    const object = current as object;
    if (seen.has(object)) {
      throw new Error(`${path} contains a circular reference`);
    }
    seen.add(object);
System.Management.Automation.RemoteException
    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        visit(current[i], `${path}[${i}]`);
      }
      seen.delete(object);
      return;
    }
System.Management.Automation.RemoteException
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${path} must be a plain object, array, or primitive`);
    }
System.Management.Automation.RemoteException
    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      visit(child, `${path}.${key}`);
    }
    seen.delete(object);
  }
System.Management.Automation.RemoteException
  visit(value, label);
}
System.Management.Automation.RemoteException
export function jsonFingerprint(value: unknown, label = 'value'): string {
  assertJsonCompatible(value, label);
  return JSON.stringify(value)!;
}
System.Management.Automation.RemoteException
/**
 * Validates that `value` is JSON-compatible, then deep-clones via JSON
 * round-trip. Used by recorders and capture utilities to detach values
 * from caller-owned references so subsequent mutation cannot corrupt
 * stored snapshots.
 */
export function cloneJsonValue<T>(value: T, label: string): T {
  assertJsonCompatible(value, label);
  return JSON.parse(JSON.stringify(value)) as T;
}
System.Management.Automation.RemoteException
/**
 * Convert a `Uint8Array` to a base64 string. Uses the global `btoa` (Node 16+
 * / browser); processes in 4 KiB chunks to avoid a single huge intermediate
 * string. civ-engine doesn't depend on `@types/node`'s `Buffer`, so we use
 * the platform-native API. Used by session-recording sinks for `dataUrl`
 * attachment encoding.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 4096;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    let s = '';
    for (let j = 0; j < chunk.length; j++) s += String.fromCharCode(chunk[j]);
    binary += s;
  }
  return btoa(binary);
}
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:23:49.834924Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:23:49.835433Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:24:26.398436Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npm --version'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npm --version' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npm --version'` rejected: blocked by policy
2026-04-28T01:24:26.400836Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npm.cmd --version'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npm.cmd --version' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npm.cmd --version'` rejected: blocked by policy
2026-04-28T01:24:26.404768Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npx --version'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npx --version' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npx --version'` rejected: blocked by policy
2026-04-28T01:24:26.410928Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npx.cmd --version'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npx.cmd --version' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npx.cmd --version'` rejected: blocked by policy
2026-04-28T01:24:26.638342Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:24:26.638875Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
IΓÇÖve got the core mismatches. IΓÇÖm pulling a few exact source line references from the current repo now so I can tie the findings to the real `JsonValue`, `SessionSource`, and current test-count baseline instead of hand-waving them.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\json.ts -Pattern 'export type JsonValue|must not be undefined'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\devlog\\summary.md -Pattern '842 passed|845 passing|Behavioral Metrics over Corpus'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-sink.ts -Pattern 'export interface SessionSource|attachments\\(\\): IterableIterator|toBundle\\(\\): SessionBundle'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-file-sink.ts -Pattern 'toBundle\\(\\): SessionBundle|readSidecar|writeAttachment'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 457ms:
System.Management.Automation.RemoteException
src\json.ts:2:export type JsonValue =
src\json.ts:22:      throw new Error(`${path} must not be undefined`);
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 531ms:
System.Management.Automation.RemoteException
docs\devlog\summary.md:3:- 2026-04-27: Spec 8 - Behavioral Metrics over Corpus (v0.8.2) - `runMetrics(bundles, 
metrics)` pure-function reducer over `Iterable<SessionBundle>` + 11 engine-generic built-in metric factories + 
accumulator-style `Metric` contract + `compareMetricsResults` thin delta helper. 5 ADRs (23-27). Single-commit ship 
per AGENTS.md doc-with-code rule. 44 new tests; 842 passed + 2 todo. **Tier-2 of AI-first roadmap implemented; Spec 
1+3+8 complete.** Devlog rolled over to `2026-04-27_2026-04-27.md` (active file hit 841 lines).
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 605ms:
System.Management.Automation.RemoteException
src\session-sink.ts:47:export interface SessionSource {
src\session-sink.ts:56:  attachments(): IterableIterator<AttachmentDescriptor>;
src\session-sink.ts:58:  toBundle(): SessionBundle;
src\session-sink.ts:230:  *attachments(): IterableIterator<AttachmentDescriptor> { for (const a of this._attachments) 
yield a; }
src\session-sink.ts:232:  toBundle(): SessionBundle {
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 716ms:
System.Management.Automation.RemoteException
src\session-file-sink.ts:93:    // call `toBundle()` / `readSnapshot()` / `readSidecar()` directly.
src\session-file-sink.ts:261:  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): 
AttachmentDescriptor {
src\session-file-sink.ts:320:  readSidecar(id: string): Uint8Array {
src\session-file-sink.ts:362:  toBundle(): SessionBundle {
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:25:31.221794Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:25:31.222346Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'export interface CorpusIndexErrorDetails|readonly \\[key: string\\]: JsonValue|readonly path\\?: string|readonly key\\?: string|readonly message\\?: string'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'attachmentMime|attachmentMimes|some\\(\\(mime\\)|image/png|toEqual\\(\\[\\'image/png\\'\\]\\)|/seed/'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern '845 passing tests|842 passed|git add|Create code-review iteration 1 folders|iteration "'`2`|Spec 7 to the Tier-2|Sidecar Boundary|Limitations|materializedEndTick|dataUrl'"'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-design.md -Pattern 'attachment MIME|any-match|materializedEndTick|dataUrl attachment bytes embedded|incomplete-bundle|guide should include|Explicit dataUrl attachment bytes embedded'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 480ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:384:export interface CorpusIndexErrorDetails {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:385:  readonly [key: string]: JsonValue;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:387:  readonly path?: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:388:  readonly key?: string;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:389:  readonly message?: string;
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:25:44.398173Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
Select-String : A positional parameter cannot be found that accepts argument 'image/png\\]\)|/seed/'.
At line:2 char:1
+ Select-String -Path docs\design\2026-04-27-bundle-corpus-index-implem ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Select-String], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SelectStringCommand
 
System.Management.Automation.RemoteException
 exited 1 in 547ms:
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
Select-String : A positional parameter cannot be found that accepts argument 'image/png\\]\)|/seed/'.
At line:2 char:1
+ Select-String -Path docs\design\2026-04-27-bundle-corpus-index-implem ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Select-String], ParameterBindingException
    + FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.SelectStringCommand
 
System.Management.Automation.RemoteException
 succeeded in 539ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-design.md:3:**Status:** Accepted v4 (2026-04-27 project-local date). Fresh 
Codex brainstorm completed before drafting. Design iteration 1 was rejected under 
`docs/reviews/bundle-corpus-index/2026-04-27/design-1/` for contract/API precision issues. Design iteration 2 was 
rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-2/` for the replay-horizon name, root-key encoding, 
attachment MIME query semantics, manifest-embedded attachment caveat, and error-detail shape. Design iteration 3 was 
rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-3/` for missing-key wording on the wrong API 
surface and non-canonical `recordedAt` handling. Design iteration 4 accepted this version under 
`docs/reviews/bundle-corpus-index/2026-04-27/design-4/`.
docs\design\2026-04-27-bundle-corpus-index-design.md:153:  readonly materializedEndTick: number;
docs\design\2026-04-27-bundle-corpus-index-design.md:165:`materializedEndTick` is `metadata.incomplete === true ? 
metadata.persistedEndTick : metadata.endTick`. It is the manifest's incomplete-aware upper bound for persisted bundle 
content, not a guarantee that `SessionReplayer.openAt(materializedEndTick)` will succeed. Replay can still fail at or 
after `metadata.failedTicks`, when command payloads are missing, or when full bundle integrity checks fail. 
`SessionReplayer` remains the authority for actual replayability.
docs\design\2026-04-27-bundle-corpus-index-design.md:196:  materializedEndTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-design.md:208:`attachmentMime` matches if any MIME in 
`entry.attachmentMimes` equals any requested MIME. It is an any-match filter, not an exact-set or all-attachments 
filter.
docs\design\2026-04-27-bundle-corpus-index-design.md:210:`endTick`, `persistedEndTick`, and `materializedEndTick` are 
all exposed because they are distinct manifest/debugging facts. For "has persisted content through tick X" queries, 
use `materializedEndTick`; raw `endTick` can overstate the persisted range for finalized incomplete bundles. For 
actual replay, use `SessionReplayer.openAt()` and let it enforce failure and content-integrity constraints.
docs\design\2026-04-27-bundle-corpus-index-design.md:312:- `materializedEndTick`: finalized-manifest, incomplete-aware 
upper bound for persisted content.
docs\design\2026-04-27-bundle-corpus-index-design.md:369:For bundles without recorded failures, 
`entry.materializedEndTick` is the manifest-derived upper bound to try first. `SessionReplayer.openAt()` still owns 
the final replayability decision because it also checks command payloads and full bundle integrity.
docs\design\2026-04-27-bundle-corpus-index-design.md:407:- **Attachment MIME matching:** `attachmentMime` matches when 
any entry MIME equals any requested MIME; multi-attachment bundles prove it is not all-match or exact-set matching.
docs\design\2026-04-27-bundle-corpus-index-design.md:409:- **Tick horizon guidance:** `materializedEndTick` equals 
`persistedEndTick` for finalized incomplete bundles and `endTick` for complete bundles; raw `endTick` remains 
queryable but does not replace the materialized-content field. Recorded failures remain a replay-level constraint 
enforced by `SessionReplayer`.
docs\design\2026-04-27-bundle-corpus-index-design.md:426:- `docs/guides/bundle-corpus-index.md`: quickstart, metadata 
query guide, `runMetrics` integration, replay investigation example, closed-corpus contract, incomplete-bundle 
behavior, sidecar boundary, scan-depth behavior, limitations.
docs\design\2026-04-27-bundle-corpus-index-design.md:506:- `attachmentMime` any-match behavior is covered by a 
multi-attachment test.
docs\design\2026-04-27-bundle-corpus-index-design.md:512:- Incomplete-bundle `materializedEndTick` behavior is covered 
and documented as a manifest materialization horizon, not as a replay guarantee.
docs\design\2026-04-27-bundle-corpus-index-design.md:513:- Explicit dataUrl attachment bytes embedded in 
`manifest.json` are documented as part of manifest parse cost, not as a separate content index.
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 634ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:249:  it('derives failure counts and 
materializedEndTick from metadata', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:261:    
expect(corpus.get('complete')?.materializedEndTick).toBe(20);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:262:    
expect(corpus.get('incomplete')?.materializedEndTick).toBe(25);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:263:    expect(corpus.entries({ materializedEndTick: 
{ max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:368:  materializedEndTick?: NumberRange;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:417:  readonly materializedEndTick: number;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:530:    (refKeys.length === 1 && typeof ref.dataUrl 
=== 'string') ||
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:534:    throw corpusError(`attachments[${index}].ref 
must be dataUrl, sidecar, or auto`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:677:  const materializedEndTick = 
metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:688:    materializedEndTick,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:755:    materializedEndTick: 
query.materializedEndTick ? assertNumberRange(query.materializedEndTick, 'materializedEndTick') : undefined,
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:779:    if (ranges.materializedEndTick && 
!matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:836:- [ ] Add `docs/guides/bundle-corpus-index.md` 
with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, 
`Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Sidecar Boundary`, `Limitations`.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:851:- [ ] Modify `docs/guides/ai-integration.md` by 
adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:879:- [ ] Expected: all tests pass, preserving the 
current baseline of 845 passing tests plus the new bundle-corpus tests and the existing 2 pending tests.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:892:git add src\bundle-corpus.ts src\index.ts 
tests\bundle-corpus.test.ts package.json src\version.ts README.md docs\api-reference.md 
docs\guides\bundle-corpus-index.md docs\guides\behavioral-metrics.md docs\guides\session-recording.md 
docs\guides\ai-integration.md docs\guides\concepts.md docs\README.md docs\architecture\ARCHITECTURE.md 
docs\architecture\drift-log.md docs\architecture\decisions.md docs\design\ai-first-dev-roadmap.md 
docs\design\2026-04-27-bundle-corpus-index-design.md docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md 
docs\changelog.md docs\reviews\bundle-corpus-index docs\reviews\bundle-corpus-index-T1
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:895:- [ ] Create code-review iteration 1 folders:
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:917:- [ ] If a reviewer reports a real issue, fix 
it, rerun affected tests, rerun full gates if behavior or public docs changed, stage the updated diff, and create 
iteration `2` with the same raw/diff/REVIEW layout. Stop when reviewers accept or only nitpick.
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:927:git add 
docs\devlog\detailed\2026-04-27_2026-04-27.md docs\devlog\summary.md
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:25:44.713739Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:25:44.714238Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'query.key instanceof RegExp|/seed/'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 421ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:246:    expect(corpus.entries({ key: /seed/ 
}).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:768:    if (query.key instanceof RegExp ? 
!query.key.test(entry.key) : query.key !== undefined && entry.key !== query.key) return false;
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:25:48.375155Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:25:48.375628Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'does not read missing sidecar bytes|attachmentMimes\\)\\.toEqual|attachmentMime: ''image/png'''" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 430ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:206:  it('does not read missing sidecar bytes during 
listing or loadBundle', () => {
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:215:    const entry = corpus.entries({ 
attachmentMime: 'image/png' })[0];
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:218:    
expect(entry.attachmentMimes).toEqual(['image/png']);
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:25:52.571726Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:25:52.572208Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:26:02.575148Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'node -v'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'node -v' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'node -v'` rejected: blocked by policy
2026-04-28T01:26:02.577277Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'where.exe node'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'where.exe node' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'where.exe node'` rejected: blocked by policy
2026-04-28T01:26:02.822582Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:26:02.823098Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path src\\session-errors.ts -Pattern 'readonly details: JsonValue | undefined|constructor\\(message: string, details\\?: JsonValue\\)'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 421ms:
System.Management.Automation.RemoteException
src\session-errors.ts:11:  readonly details: JsonValue | undefined;
src\session-errors.ts:12:  constructor(message: string, details?: JsonValue) {
src\session-errors.ts:28:  readonly referencesValidationRule: string | undefined;
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:26:57.238563Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:26:57.239143Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
- High: The core error-details type in the plan is not internally consistent TypeScript for this repo. `CorpusIndexErrorDetails` is declared with a string index signature of `JsonValue`, but it also makes `path`, `key`, and `message` optional; in `civ-engine`, `JsonValue` excludes `undefined`, and `SessionRecordingError.details` is typed as `JsonValue | undefined`. This will fail typecheck before implementation gets off the ground. Fix: either make those fields JSON-safe and always present (`string | null`), or drop the open index signature and put extensible payload under an explicit JSON-safe subobject. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:384>), [src/json.ts](</C:/Users/38909/Documents/github/civ-engine/src/json.ts:2>), [src/json.ts](</C:/Users/38909/Documents/github/civ-engine/src/json.ts:22>), [src/session-errors.ts](</C:/Users/38909/Documents/github/civ-engine/src/session-errors.ts:11>)
System.Management.Automation.RemoteException
- Medium: The `attachmentMime` contract is not actually pinned by TDD. The only MIME test uses a single PNG attachment, so it cannot catch the exact bug class the accepted design calls out: any-match vs all-match/exact-set behavior on multi-attachment bundles. Fix: add a multi-attachment fixture with at least two different MIME values and assert positive any-match plus negative cases that would fail under exact-set/all-match semantics. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:206>), [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:215>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:208>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:407>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:506>)
System.Management.Automation.RemoteException
- Medium: The planned `key: RegExp` implementation is subtly incorrect for legal `/g` or `/y` regexes. `compileQuery()` calls `query.key.test(entry.key)` directly per entry, which mutates `lastIndex` and can make the same query return different results based on traversal order. The current tests use `/seed/`, so they would not catch it. Fix: clone/sanitize the regex before filtering or reset `lastIndex` before every `test()`, and add a regression test with a global regex. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:246>), [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:768>)
System.Management.Automation.RemoteException
- Medium: The doc plan does not concretely cover two accepted-design requirements: documenting `materializedEndTick` as a persisted-content horizon rather than a replay guarantee, and documenting embedded `dataUrl` attachments as manifest parse cost rather than indexed content. The planned guide section list omits incomplete-bundle behavior entirely, so these are easy to miss. Fix: add explicit guide/API-reference/changelog tasks for both callouts. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:836>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:165>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:426>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:512>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:513>)
System.Management.Automation.RemoteException
- Medium: The expected full-suite output is already stale. The plan hardcodes a baseline of `845 passing tests`, but the current repo summary for v0.8.2 records `842 passed + 2 todo`. That makes the validation stepΓÇÖs expected result false before work starts. Fix: refresh the baseline from the repo at execution time, or stop hardcoding counts and assert only that all tests pass. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:879>), [docs/devlog/summary.md](</C:/Users/38909/Documents/github/civ-engine/docs/devlog/summary.md:3>)
System.Management.Automation.RemoteException
- Medium: The re-review staging loop is incomplete. The only explicit `git add` for `docs/reviews/bundle-corpus-index-T1` happens before iteration 1 is created; later the plan says to create iteration 2+ if needed, but it never explicitly re-stages those new review files before the final commit. That risks missing mandatory AGENTS.md review artifacts in the single direct-to-main commit. Fix: after every review iteration, rerun `git add docs\\reviews\\bundle-corpus-index-T1` (or the full staged-file list) before final verification. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:892>), [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:917>)
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
tokens used
154,328
- High: The core error-details type in the plan is not internally consistent TypeScript for this repo. `CorpusIndexErrorDetails` is declared with a string index signature of `JsonValue`, but it also makes `path`, `key`, and `message` optional; in `civ-engine`, `JsonValue` excludes `undefined`, and `SessionRecordingError.details` is typed as `JsonValue | undefined`. This will fail typecheck before implementation gets off the ground. Fix: either make those fields JSON-safe and always present (`string | null`), or drop the open index signature and put extensible payload under an explicit JSON-safe subobject. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:384>), [src/json.ts](</C:/Users/38909/Documents/github/civ-engine/src/json.ts:2>), [src/json.ts](</C:/Users/38909/Documents/github/civ-engine/src/json.ts:22>), [src/session-errors.ts](</C:/Users/38909/Documents/github/civ-engine/src/session-errors.ts:11>)

- Medium: The `attachmentMime` contract is not actually pinned by TDD. The only MIME test uses a single PNG attachment, so it cannot catch the exact bug class the accepted design calls out: any-match vs all-match/exact-set behavior on multi-attachment bundles. Fix: add a multi-attachment fixture with at least two different MIME values and assert positive any-match plus negative cases that would fail under exact-set/all-match semantics. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:206>), [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:215>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:208>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:407>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:506>)

- Medium: The planned `key: RegExp` implementation is subtly incorrect for legal `/g` or `/y` regexes. `compileQuery()` calls `query.key.test(entry.key)` directly per entry, which mutates `lastIndex` and can make the same query return different results based on traversal order. The current tests use `/seed/`, so they would not catch it. Fix: clone/sanitize the regex before filtering or reset `lastIndex` before every `test()`, and add a regression test with a global regex. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:246>), [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:768>)

- Medium: The doc plan does not concretely cover two accepted-design requirements: documenting `materializedEndTick` as a persisted-content horizon rather than a replay guarantee, and documenting embedded `dataUrl` attachments as manifest parse cost rather than indexed content. The planned guide section list omits incomplete-bundle behavior entirely, so these are easy to miss. Fix: add explicit guide/API-reference/changelog tasks for both callouts. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:836>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:165>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:426>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:512>), [design](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-design.md:513>)

- Medium: The expected full-suite output is already stale. The plan hardcodes a baseline of `845 passing tests`, but the current repo summary for v0.8.2 records `842 passed + 2 todo`. That makes the validation stepΓÇÖs expected result false before work starts. Fix: refresh the baseline from the repo at execution time, or stop hardcoding counts and assert only that all tests pass. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:879>), [docs/devlog/summary.md](</C:/Users/38909/Documents/github/civ-engine/docs/devlog/summary.md:3>)

- Medium: The re-review staging loop is incomplete. The only explicit `git add` for `docs/reviews/bundle-corpus-index-T1` happens before iteration 1 is created; later the plan says to create iteration 2+ if needed, but it never explicitly re-stages those new review files before the final commit. That risks missing mandatory AGENTS.md review artifacts in the single direct-to-main commit. Fix: after every review iteration, rerun `git add docs\\reviews\\bundle-corpus-index-T1` (or the full staged-file list) before final verification. [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:892>), [plan](</C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:917>)


