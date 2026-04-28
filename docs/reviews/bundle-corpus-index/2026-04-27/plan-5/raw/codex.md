Reading additional input from stdin...
2026-04-28T01:56:14.385006Z  WARN codex_core::plugins::startup_sync: startup remote plugin sync failed; will retry on next app-server start error=remote plugin sync request to https://chatgpt.com/backend-api/plugins/list failed with status 403 Forbidden: <html>
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
      <div class="data"><div class="main-wrapper" role="main"><div class="main-content"><noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript></div></div><script>(function(){window._cf_chl_opt = {cFPWv: 'g',cH: 'Eg7HtePcg9yuLr_7_IH3zbZ.ijv.z6OK9ICLrUR2Fxw-1777341374-1.2.1.1-pjlWQHj4I4E1GnfgftqcAMLkXeMSZqhkPAisuR76C6G5d54BGiD0OTNa3Yh7sxMq',cITimeS: '1777341374',cRay: '9f327305cad37ae2',cTplB: '0',cTplC:1,cTplO:0,cTplV:5,cType: 'managed',cUPMDTk:"/backend-api/plugins/list?__cf_chl_tk=foN4kq7og7GNVt_ePkxg4chKflENaWRkXbRZFGnsPRs-1777341374-1.0.1.1-RTs9ytAVqfJjCLE65CfecXrD.As6YlSR18.PjqKH6DU",cvId: '3',cZone: 'chatgpt.com',fa:"/backend-api/plugins/list?__cf_chl_f_tk=foN4kq7og7GNVt_ePkxg4chKflENaWRkXbRZFGnsPRs-1777341374-1.0.1.1-RTs9ytAVqfJjCLE65CfecXrD.As6YlSR18.PjqKH6DU",md: 'TxPuvkbHeQbuT7dzRbkoa2FJrslkd2gGKivXyMWXG5M-1777341374-1.2.1.1-y2KyovIhDvRFUyvxVyETFEhgkJYgm04Q05WE5_9urEGpgw5vQEyPFmhfPEQLfJBbuH_XIPdFIr88hepWN.hSCH8uXGWJ8GhjuEZlkPhhiyI13nWSWMI922l1_BmHi3MZfD7cH5nggtsMgBjYugk_SvEk5E_zes7tU4A1Gtm96lFfp9NcA7vl6FTis3H7Y0ruJ69fg1VOk_AAQrjkEQpwmWpYVCsxfpbD8EujcgKQatrleCRjzmREOrtjkoR0I9yK_Uu8ufRPPMOqQw2La3VszBK6BcleLqBJ4E9JUHXCASo4R6s4bsjIUQMNihaU72QVoL9G8OMHjuTQbRwRJAFhXUMCc2xHMr_9gxkXYl841kMdxt7iMSj2hgKR4y1srhrZtEmgB7ftlfprEHOdqY261ofWtzgQT0sThJAiLLVvsQgD4BJoKzmN8pCOISI9zjMLBCViEwdIJ4lQYoonQiTCioq3HDAk4OxObwaVM.n11046S9lv7fWT8SZzZihb4uGddNhiKzTBe7o0A0qg5FysFvbBmWvmuem9JUrnRoAbqyLSUEXudiBTfvjCa2UcTBNnhJdT6oJYzF1yQ6NlL7WOysC7j_haLe9Ndtc4umMxjxI6ha_bwXDT48QbIv5kFhIXJdqS7o2F.tsA5ei8Hger2nU6QHa0qHmxwuhLjGACUPlrzUqBxUADAElPBuCd3GpeS6sIAgWBCAnMjChDN.89b3doj6o9BwB6heJd9IC0HNLZwsZpQtGf15d5_juiJtxN_5C5BFzVWRL.KGW6savZsiqM.JZgRN4Zqu9bc5N6sLe.d9NndQv9wTxU9DOhqq7578ErXosBh8Ii_4nqRLLqwcivpvtqnGCUDfuwDOgI3RkrlA0C1sgvSd_azYqAB67JQx6RGI5QecpIO6pg3MhC6izvvR6Aoj5R6Vubfl09rQLHXvcjW1CPUIcVxOCI4iV.zUxT0WRmB6XvpNBB23YRgXIGVizioYxj5Rwn7N4p0cmHYOK1WiVXhs9XF8XgmB1Ah2YUul7eDI6ftGPiiYMJjaqmlRtb9Oo4x0VLae..uWE8uQbvcgNiWx278BAzDLqI',mdrd: 'NqXG.CGj94ynAW4E6uzdeYBe9JqZXglEPxZ51rhElU0-1777341374-1.2.1.1-fgfQRoRpNygbAQrj5MXuO_lw51na0OT6RqH6sjcjX9QGygrPZTAOZZlfKtfPH6F3aqGhWs86.TSzaRlDISSKPhOfAFuM7UqR_.Fr7JdWXg4zrySIJnDMdQdjR0TWPWRb9A4rR_meFoTodR3AF3Gzjfi10VpZQkSroY5vo9k8vjRtPitQCKnmhT0HpccrV8Y5Z1l5DbUXTYGPhcc.wLvSHM.kVN3Rr_s_1KwaOZ74pQttNC4H08h24bTTRgQrppZXuIuA3pu7RBCEpM2SNguuiOHoNUFqnJWl5fKAbhXVkL_yRjw0HhYAOZgmTjnVDZApePfO4JXbg_dJa.2ITv_Y0zP4J6PQHmTWMdnaxGu2UVw96E4hbYcWr6jmtEeVGjOXfje62TXnQwenwuQHtG1Ma4yhmLe7IwZJ2pxnBDSy.mglcs.jM.DC2GTQbI.96ivPmkhKJGCt9.dArsxHcj7BqK5R77tNXegofLGNKCa4PyDKYl8XinTwACP0W_oy9NUT44zPDFj_t5.tP458McTec5P24dcsaL5gkAjLDXFP2ekR_O3ctZKEK6qkObzDRrRagzjM1LIh4K.MnWG2w4XW7wn.Ih9_BWy3oKBHq0OfCzuNhde4IQ0B3hhaDOQkCKf1NEIzaSHniekWxap1UFPHaq7IFb7YnSa8f0D54U1vcyJd2bpXAdkzLEdtrld5HlOAuEt33vNPkLGjvcH59DR4F12Gq_TUE2opE4do8JCujplRp8XNutGTI8qiuDyknJLW3fSb9IL_cJ5c1zHqlwwF_eRV8ye0cNJdp8C979fRvtVtm1Qi9KxhZhitz4wesW3daE7mFbt_w5__V3Ee1QZcH0pzm2LJNV9TdJTSai6TyFxjZm8SAaV4ayOuDsd8zoksulcSUAGmlVeOmKl5rGYanVKuXEhFzwxmLtCRnyR1NoUhFYrBX7Z.iJCUqkhN54gmtiSYoxUA6bhZJ_KHYWo.v2na2n0npqjO43Jmj9Z_YNlznAdoHNGC49xru_EpAKB1SfYCKmlSR98BvDGrH.BrGHbdtEsaMySd6DQkWrNRGvtd.W4RlOyeKYrRbCUrtOUU9SSFwGp5TkGyL8ZXlj2WqkDyLfmRlY7A94f3P5fAmyY6nvr9ZMCnhxG.ZrfEnvb7OqrqJT4MRgBgcsVoNqFsfmL.85Tz.BmgnceOUl_BrnZ4oHk5GsWJTAdHcGZGFtMucuda2RVqHxSEyfI..tNwfmAbcnNcyK5JVZHuu3Nm1aEUM4EHGiOlYOiy88SRkGWwKDT.EMvSML6RrkC5RvPwOjLihWwr6dz97z9N_pucNP3kI7vC11JsOlNSX__jF7Bcd0GbV5dm1rZqpXZcluTkHoyh2FukpkAOScQMZnK2A5cppSZJ6YaVa4wnHCNrCsK4feyaAwOYgaibN8Jw5VmPS74pK7d4jmD6x0eBqEhlfmdBTWE3ImmJYjTTZPaekA6eVKnjG7M8N8oJX8StgcuYJSr6ZNMiiypYUrir0MMoyQ.AMvB4sjY5vX60Rbt4TnJZYbBxiINcCsatVc4pYScfms43g8Y.f.HAUZIjkNeE4b127zbrnX9WjDQLQ3jUpbC8s8X52b0A6nWHw4f1_nqVMTXzoQjJhNk0rXg3XFk_lz6iRxEv8g.eLVemhSNLKN0Qq9YGuYK7E7_OWDindBX5zJhUKDhxKzpdsdF60KDNbEv8bGFW1Jxo7J3rNeMkdvuubRR8N_Z41xQFpWkAHFP2T_L_2UZUVBGuswCz1xhMgdHp8BtSjmo2ZFL1sRC.frkh1JPnn0TWX5DnR9Rr5YflkxSV9YeySYFliJogTded4SAcvM46qBXk0vVYYvIdgOe_EcJjB1U8WrqknqkIIryClNzW9tvhX5YV.wHMRcx3KyIa8GC2LAHAIlOThnji4Utw6wnywDWpdlktYduKz29yQS0p4XyNPcV6eRR3Hk9UDLtHrag9e.Id93.AGYAaIob3rLd_u7iUJfMrNVm44akO5MHrExcsGRP_04gyfvncC9YG7RAxBrgiIC9WuTC2JTmPvYSU8Qk1mBRHvEW_wAKTQmFSF0Bgd7J.vmIGlyaKYXMRINlsPNeNsQVW_FuT752fWcCk953bxaam2jbS33nLR5uQ8A9FURZv_nLt1ep7lwhrByhC0vgd2obOlzAi3cXJl6ZwGSzaFP5sZlOfKwNwIh85ScGrsHXu7peDyI.tHryO1bx434R1FIr2hyvPwlB5Wag6ntyaXHdJBlXg8qYOWQ',};var a = document.createElement('script');a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=9f327305cad37ae2';window._cf_chl_opt.cOgUHash = location.hash === '' && location.href.indexOf('#') !== -1 ? '#' : location.hash;window._cf_chl_opt.cOgUQuery = location.search === '' && location.href.slice(0, location.href.length - window._cf_chl_opt.cOgUHash.length).indexOf('?') !== -1 ? '?' : location.search;if (window.history && window.history.replaceState) {var ogU = location.pathname + window._cf_chl_opt.cOgUQuery + window._cf_chl_opt.cOgUHash;history.replaceState(null, null,"/backend-api/plugins/list?__cf_chl_rt_tk=foN4kq7og7GNVt_ePkxg4chKflENaWRkXbRZFGnsPRs-1777341374-1.0.1.1-RTs9ytAVqfJjCLE65CfecXrD.As6YlSR18.PjqKH6DU"+ window._cf_chl_opt.cOgUHash);a.onload = function() {history.replaceState(null, null, ogU);}}document.getElementsByTagName('head')[0].appendChild(a);}());</script></div>
    </div>
  </body>
</html>
System.Management.Automation.RemoteException
2026-04-28T01:56:14.392346Z  WARN codex_core::plugins::manager: failed to warm featured plugin ids cache error=remote plugin sync request to https://chatgpt.com/backend-api/plugins/featured failed with status 403 Forbidden: <html>
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
      <div class="data"><div class="main-wrapper" role="main"><div class="main-content"><noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript></div></div><script>(function(){window._cf_chl_opt = {cFPWv: 'g',cH: 'D29ILsPgLl5hyfdecT86l0mceBFUtwT2Rg3EhMZHB9I-1777341374-1.2.1.1-B9klUQd6AUDZ1RNCrhP0dBEnie00G5pliKD2BNrqpndDMr6MupOGMctQKrWPAtHg',cITimeS: '1777341374',cRay: '9f327305dad71701',cTplB: '0',cTplC:1,cTplO:0,cTplV:5,cType: 'managed',cUPMDTk:"/backend-api/plugins/featured?platform=codex&__cf_chl_tk=2ay9_Qg_r_MQ_MP0h.2ycznNKnZcKrNRiHNnMF575eM-1777341374-1.0.1.1-Q9QX.hOVSvIImNTbiUArVKEqprUviEfda.QkC77EHA8",cvId: '3',cZone: 'chatgpt.com',fa:"/backend-api/plugins/featured?platform=codex&__cf_chl_f_tk=2ay9_Qg_r_MQ_MP0h.2ycznNKnZcKrNRiHNnMF575eM-1777341374-1.0.1.1-Q9QX.hOVSvIImNTbiUArVKEqprUviEfda.QkC77EHA8",md: 'rbtWCd_5ZtmBB16zgvD1uE59bJ.yC6JQy3P.Ifo_Yk8-1777341374-1.2.1.1-ZkNr0NolRs7dLkg6Cy8.EJIlmEl0Z7K1p27MYbhdgNQ9kYD90KKcTdqYv0dEHwnOlX_bXvS0KkVhumIGnOSQe5OHnfNzlHKyNhm2YiWOfR.TOkT9rYqg6Lg1v5yJ0z3UvrLtKlGIHGEdjyf.J_qfbyHCTE.PXEaeoFv.VoxSkUrjHcTRGYpYr3qOYk0nIzpHIXarYYqCo7ovYbOZDjunOoKb80Nu_Pchbvg9y5rYb_a9btoRDQXF9IPbmhLR.FEMcEHB_qslYmk2qGfAQjzr1tHAD0qkg2NDaptwdzm7h0PJ6tZ1Tj8WVk2bzTC3q1Y1y.vITTx67mE6FuQqZa6Wt7nPJj2yGksQ_l6wh9R2w8i2GyHeThIngx.6oCPOhmLyUpJAxt8wvOn0GR6KPZGxlTWM_oB.EvzFhZzxWBZwaoSSLsdzvfQxsD4oiyfvmMgY5eGJh9bp.MUBrx6Dd3wJDLQpJQoM2s76XrBEwONtbxRpOZ_dBF4pipva4jmuNHVH_0SNnGvNlkj_2Wia6dNMWNFb.9TGg4WYv41JDOVzPZZ01W53rsNKeTeRl.B_DV4MXD53cP3sKjh9BT5t5hNUAUC_rB01s8RvL38rQDkdaAwk3zsuHL3WnHK4XVqHf16ZinymNriK.a_NBgjqZfMiPx.Nvf4NVyu1Te1QUs75ikBdzlD4dutLHLfCv9AijWjQwo7gbr3MMFhpgqUX2tv6bSPS7T.10YlluOkQJ.i_XrHlzdNx5rlPWsR4DtU90ZTb8TsWiISznJ6Xan_k1dHx.OgC8gIWA8IR3jckomPS4alZQlKB60CwPmWWOjHMQl4uufG3UB1Umek0mSk4xokA6DQA.Ga6HnHhR3g6SDo6WJ2_CChB0BwUbnneKiQss_YRaNevOg5l5Y7yDTijHx2oWS.Zy62Ej7eY8q2CG7q0fkLFvv4HhzV7bRWZCXl9HZw9992R8xB.j95w8c25HSMzdnfRb0lFHMGVJkZDbIcsSuK8AeJEcnd6gY4pZnyw825SKFyVybEeAGIk6OUkK2MlFbueHNNEUdTjJSO71a9xa62Ksav4GaGvIfa9GcdKMNvtpaUL5GMIm8QEImAZl2sMzw',mdrd: 'akgX4f.lEWFGWx5SCwotaSdTvOswOi_JIpqOGt.m4co-1777341374-1.2.1.1-XWaDJO9l4DW0r1lyiKqHosafC9EajLhnP0xRuWE3qdhKKrOZ4sj09N9JlNs3Y7D1Jyjvf2m92NmUDplrcHB59nqZEexK0ZnLaq43qvJ.jPqNlyObTwEajidJiblf.T_PNfS.r48lpYGTo1.m8AfLUo3CTFPq.45Pf1T_nf9uxKN0lFWG0CCIjDesRG8dnlYY3vHMXeS2l2iD5P0hE0eBIWxfSNPy9.f4Dz5.BhpSIUgTiR2p1m6dUGkZmvBfNVRmWen.nEKyjy1wyrsLvdZUYOPG_OOiw4fr1oJadqwFSFZCNtxI7DT0R71zDaj1cUlFRYMfrnQUiurc.RflpsNfvVTgUCCPJpbDwMpf_T2wWJUgedNbqpbF2QUhHn9uxEt9TtqOPAkNp5TnXGW9CFe3ZbAcSUQcHcvC4ZyTsJP9tsoAovUB_5TFX5H2tWkJxTjsa18nGuhHUVUmay5BSi_2l86X44WQ7aLAn8Bh1lqGwagNPku4zt6p8GjpxiyFIn.sW9IwPY_AZU9uPvm_YEgLi2h6NeNdwTP6TIzWa4SpQuB_g.uysJzuPfRZzLhdpeNuaWIEdyHppxWEZ_uRD.yDavq0UDYfPwe4lfi0xvdpGKHPXOO2cVsH.goYxbqxh_zeusTs1pRF1GLe8dbBWtcPuEnEtKqHPuyF084NdCXqDhP6Dax81P58BgfnEzlM2PacpNCnox96DtIBStJMux2v2YERDkSmgsOf.IFloVUtT3Elj.M0qKVghITQtklgkkHGZDO2y3UJxzrUnN5tJBPp2w67sKPXChkMLceJ0S7Jt2zd_TEqiBnKOu9YYVfRygCE_3XIUJYvcK.Ri6rjWhzxBQ.L0aSaNy1hKk98GoYr0saYLot1wNC7jgXHeeYVIgwhe41sulrrFYiLyEEpU53ufhR0cqtdWFJ6ZrhLtcmWxjUnM_cpG_55LzWYI5eZTSD.2Qlz.g2jqwFzr5ogr3JLFSaD.HDp6FaiE7sZDdlaUUYBhHk8Vv4kuzqEkgTupiITJff2lg7JYa3W_I38LUHgpoETzHN1Rhwrnp.S85OFP04jUKmgyLK4b6JLX6ptfkdy8T7d.bMJ69ktp6kFJ45t2xn6mgZX7D0Z3KBBNzegSR0BUYCThgtewbPNvR02Jl5VujyU.cAkWWvnJpAqivhdqdHvK3RYzcpm8dzIW6MPMCyMF6FCs0jDGdpkB0xhoYTqkl_VBdfQHISWwS0WZx.gqdmFVkVAz7Rx1f2OKpgPjgPQLc.P0Ub8NPi5vatNQNBrQ0ZxL7mijwIsY2Tj.Ogmm5dNkWIAGPPm9MdV5SBeAingGXhGEHLK0kqccG.4_OA_GjmGQBesU4kMxNksKQ8aBe1L_bAwR4pCs8LDFB3GlxhRXcdv6DImvi7EcMbIM6Ay9dWV1SunQFxjNHz7Xl6IFrOgnECEtp8aAoW3Qbf.bPF6_9fiVUzZML1G3J0MjLoCtuYp8SK9BI__HjhWpsaVS5vyoHkF9XT7m2Biwn6LxW85.B6IYlV5BMurHZKAF.xsDgmKaLHvlt_I9OeOwhZBPjIrAblmoeA8EFPqddNEN4PfG_n1XtroUIT3kmpuNyGK5YtYvLXEv37.2G.gJFs566bSmSir3m2VeyYTJ6EgFmL83zCzWNdQ0jO33dUFvxb_XO7vHcD.7UGMZZNTc_SsdBgFqsJfnEJUOx5VrdKwqq9xz.AAu79uaf6UjZgrVpFtVP3NTNGD4kQ7aRNyEEAHYGv8Xkj4Q95Cd8lvsQOJAfaJJ9K_5QLlMz4hqT95eR_H3xQ6JnHBN1sxHBAoDez9WmEd6d4Is1RiVD6YfwwNMnjcnWLOY3AesHm.tQzB2UKpXIsmxKfDuvbPu5k4.RdvuN2tgepK_09.m_V3RFKhBEJE0POEsZGPzlue.aTJKWE6CF0kF1UG72gvPQk58AJrvtVhbaYnwu.YNJ967RL2patpXeWqflJaYmFiSs5GI9LplEIbSr3jwQRi9xirD28g1fb4wNOBM3XdiSAjMJV6C0DcnUKjcpdcVvCDkWurRgGC7C.NbdnNbiJrmZG5h4QydGdPK_NVGFNnd7JcrU14y8vpH5s3zG3BTPJjxTKXIHmw6lci2E2nKnSNbf2bw9tHqyMEUAH0pBLPnsrHsS.NAwQswOPbsDSMBnQtbgCvzID3Gh1Vd4pTRxdOa6WlJxUDeGFGDarbAagJRCzpTFWeFlExpQGC6U3KMBwsBVVTUFUiF.pULWN4Z73KgKXWbvLTvg',};var a = document.createElement('script');a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=9f327305dad71701';window._cf_chl_opt.cOgUHash = location.hash === '' && location.href.indexOf('#') !== -1 ? '#' : location.hash;window._cf_chl_opt.cOgUQuery = location.search === '' && location.href.slice(0, location.href.length - window._cf_chl_opt.cOgUHash.length).indexOf('?') !== -1 ? '?' : location.search;if (window.history && window.history.replaceState) {var ogU = location.pathname + window._cf_chl_opt.cOgUQuery + window._cf_chl_opt.cOgUHash;history.replaceState(null, null,"/backend-api/plugins/featured?platform=codex&__cf_chl_rt_tk=2ay9_Qg_r_MQ_MP0h.2ycznNKnZcKrNRiHNnMF575eM-1777341374-1.0.1.1-Q9QX.hOVSvIImNTbiUArVKEqprUviEfda.QkC77EHA8"+ window._cf_chl_opt.cOgUHash);a.onload = function() {history.replaceState(null, null, ogU);}}document.getElementsByTagName('head')[0].appendChild(a);}());</script></div>
    </div>
  </body>
</html>
System.Management.Automation.RemoteException
2026-04-28T01:56:14.466216Z  WARN codex_core::shell_snapshot: Failed to create shell snapshot for powershell: Shell snapshot not supported yet for PowerShell
OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\38909\Documents\github\civ-engine
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: xhigh
reasoning summaries: none
session id: 019dd1cd-1ffa-70d2-94b9-6206b637bca2
--------
user
You are a senior design/implementation-plan reviewer for civ-engine Spec 7. This is plan review iteration 5 and should be narrow. Previous syntheses are plan-1 through plan-4 REVIEW.md under docs/reviews/bundle-corpus-index/2026-04-27. Verify the v5 plan fixes the last plan-4 finding: code-review iteration 2+ prompts include prior REVIEW.md files and docs/learning/lessons.md, and after 3 unresolved code-review iterations the plan escalates to Opus tie-breaker. Look for remaining real blockers only. Do not modify files. If ready to implement, say ACCEPT.
System.Management.Automation.RemoteException
<stdin>
diff --git a/docs/design/2026-04-27-bundle-corpus-index-design.md b/docs/design/2026-04-27-bundle-corpus-index-design.md
new file mode 100644
index 0000000..0cf00f0
--- /dev/null
+++ b/docs/design/2026-04-27-bundle-corpus-index-design.md
@@ -0,0 +1,518 @@
+# Bundle Search / Corpus Index - Design Spec
+
+**Status:** Accepted v4 (2026-04-27 project-local date) with a plan-review type correction for `CorpusIndexErrorDetails` after `docs/reviews/bundle-corpus-index/2026-04-27/plan-1/`. Fresh Codex brainstorm completed before drafting. Design iteration 1 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-1/` for contract/API precision issues. Design iteration 2 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-2/` for the replay-horizon name, root-key encoding, attachment MIME query semantics, manifest-embedded attachment caveat, and error-detail shape. Design iteration 3 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-3/` for missing-key wording on the wrong API surface and non-canonical `recordedAt` handling. Design iteration 4 accepted this version under `docs/reviews/bundle-corpus-index/2026-04-27/design-4/`.
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
+  readonly path: string | null;
+  readonly key: string | null;
+  readonly message: string | null;
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
+`details.code` is the public discriminator, following the existing session-recording error discipline. `details.path`, `details.key`, `details.message`, and other fields are JSON-shaped information that can be logged or serialized without carrying raw filesystem handles or exception objects. Optional human fields use `null` when absent so the overridden `details` property remains assignable to the existing `SessionRecordingError.details: JsonValue | undefined` contract.
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
+String comparisons use JavaScript code-unit order (`<` / `>`) rather than locale collation so CI output is stable across host locales. This order is deterministic for a stable corpus and useful for human reading. The `key` tiebreaker closes timestamp/session collisions.
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
+- `docs/api-reference.md`: new `## Bundle Corpus Index (v0.8.3)` section for `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
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
+- `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, `InvalidCorpusEntry`, and supporting types are exported from `src/index.ts`.
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
index 0000000..67b4e39
--- /dev/null
+++ b/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md
@@ -0,0 +1,1105 @@
+# Bundle Corpus Index Implementation Plan
+
+> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
+
+**Plan revision:** v5 (2026-04-27) - fixes plan-review iteration 4 findings from `docs/reviews/bundle-corpus-index/2026-04-27/plan-4/`: code-review re-review prompts must include prior `REVIEW.md` files and `docs/learning/lessons.md`, with an explicit Opus tie-breaker branch after 3 unresolved iterations.
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
+  it('stops descending once a directory is a bundle', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'outer'), metadata('outer'));
+    writeBundle(join(root, 'outer', 'nested'), metadata('nested'));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['outer']);
+  });
+
+  it('uses locale-independent code-unit ordering for ties', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'lower'), metadata('alpha', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    writeBundle(join(root, 'upper'), metadata('Zulu', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.metadata.sessionId)).toEqual(['Zulu', 'alpha']);
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
+  it('loads bundles lazily one iterator step at a time', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'first'), metadata('first', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    const second = join(root, 'second');
+    writeBundle(second, metadata('second', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeFileSync(join(second, 'ticks.jsonl'), '{"tick":\n{}\n');
+
+    const iterator = new BundleCorpus(root).bundles();
+    const first = iterator.next();
+    expect(first.done).toBe(false);
+    expect(first.value.metadata.sessionId).toBe('first');
+    expect(() => iterator.next()).toThrow();
+  });
+
+  it('matches attachmentMime when any MIME overlaps the requested set', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'mixed'), metadata('mixed'), [
+      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
+      { id: 'trace', mime: 'application/json', sizeBytes: 3, ref: { sidecar: true } },
+    ]);
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.get('mixed')?.attachmentMimes).toEqual(['application/json', 'image/png']);
+    expect(corpus.entries({ attachmentMime: 'application/json' }).map((entry) => entry.key)).toEqual(['mixed']);
+    expect(corpus.entries({ attachmentMime: ['text/plain', 'image/png'] }).map((entry) => entry.key)).toEqual(['mixed']);
+    expect(corpus.entries({ attachmentMime: ['text/plain', 'text/csv'] }).map((entry) => entry.key)).toEqual([]);
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
+    const stateful = /seed/g;
+    expect(corpus.entries({ key: stateful }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
+    expect(stateful.lastIndex).toBe(0);
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
+    expect(corpus.entries({ incomplete: true }).map((entry) => entry.key)).toEqual(['incomplete']);
+    expect(corpus.entries({ incomplete: false }).map((entry) => entry.key)).toEqual(['complete']);
+    expect(corpus.entries({ materializedEndTick: { max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+    expect(corpus.entries({ endTick: { min: 50 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+    const failedTicks = corpus.get('incomplete')!.metadata.failedTicks!;
+    expect(Object.isFrozen(failedTicks)).toBe(true);
+    expect(() => failedTicks.push(99)).toThrow(TypeError);
+    expect(corpus.get('incomplete')!.metadata.failedTicks).toEqual([26, 27]);
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
+export type OneOrMany<T> = T | readonly T[];
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
+  readonly path: string | null;
+  readonly key: string | null;
+  readonly message: string | null;
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
+interface CorpusIndexErrorDetailsInput {
+  readonly [key: string]: JsonValue | undefined;
+  readonly code: CorpusIndexErrorCode;
+  readonly path?: string;
+  readonly key?: string;
+  readonly message?: string;
+}
+
+function normalizeDetails(input: CorpusIndexErrorDetailsInput): CorpusIndexErrorDetails {
+  const details: Record<string, JsonValue> = {};
+  for (const [key, value] of Object.entries(input)) {
+    if (value !== undefined) details[key] = value;
+  }
+  details.code = input.code;
+  details.path = input.path ?? null;
+  details.key = input.key ?? null;
+  details.message = input.message ?? null;
+  return Object.freeze(details) as CorpusIndexErrorDetails;
+}
+
+function corpusError(message: string, details: CorpusIndexErrorDetailsInput): CorpusIndexError {
+  return new CorpusIndexError(message, normalizeDetails(details));
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
+- [ ] Add a locale-independent string comparator. Use it everywhere the corpus exposes deterministic ordering.
+
+```ts
+function compareCodeUnit(a: string, b: string): number {
+  return a < b ? -1 : a > b ? 1 : 0;
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
+      .sort(compareCodeUnit);
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
+  const frozenFailedTicks = manifest.metadata.failedTicks ? Object.freeze(manifest.metadata.failedTicks.slice()) : undefined;
+  const metadata: Readonly<SessionMetadata> = Object.freeze({
+    ...manifest.metadata,
+    ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks as number[] } : {}),
+  });
+  const attachmentMimes = Object.freeze([...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort(compareCodeUnit));
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
+  return compareCodeUnit(a.metadata.recordedAt, b.metadata.recordedAt)
+    || compareCodeUnit(a.metadata.sessionId, b.metadata.sessionId)
+    || compareCodeUnit(a.key, b.key);
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
+function matchesKey(value: string, expected: string | RegExp | undefined): boolean {
+  if (expected === undefined) return true;
+  if (typeof expected === 'string') return value === expected;
+  expected.lastIndex = 0;
+  const matched = expected.test(value);
+  expected.lastIndex = 0;
+  return matched;
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
+    if (!matchesKey(entry.key, query.key)) return false;
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
+  type OneOrMany,
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
+- [ ] In `README.md`, update the existing Synthetic Playtest Harness row so it no longer says corpus indexing is "future Tier-2" work. It should say synthetic playtests produce FileSink/SessionBundle corpora that can now be indexed by `BundleCorpus` and reduced by behavioral metrics.
+- [ ] Add `docs/guides/bundle-corpus-index.md` with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, `Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Incomplete Bundle Behavior`, `Sidecar Boundary`, `Embedded dataUrl Attachment Cost`, `Limitations`.
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
+- [ ] Modify `docs/api-reference.md` with `## Bundle Corpus Index (v0.8.3)` and one subsection for each public type exported in Step 3, including `OneOrMany`. Include constructor, `entries`, `bundles`, `get`, `openSource`, `loadBundle`, and `[Symbol.iterator]` signatures exactly as accepted in the design. Document `materializedEndTick` as an incomplete-aware persisted-content horizon, not a replayability guarantee.
+- [ ] In `docs/guides/bundle-corpus-index.md` and `docs/changelog.md`, explicitly document that explicit `dataUrl` attachment bytes are embedded in `manifest.json` and therefore count as manifest parse cost, not as a separate content index.
+- [ ] Modify `docs/guides/behavioral-metrics.md` so the primary quickstart and corpus framing use disk-backed `BundleCorpus` with `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`. Keep in-memory `SessionBundle[]` accumulation only as a small-test or advanced note, not as the main path.
+- [ ] Modify `docs/guides/session-recording.md` by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and that callers should build the corpus after sinks close.
+- [ ] Modify `docs/guides/ai-integration.md` by adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
+- [ ] Modify `docs/guides/concepts.md` by adding `BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
+- [ ] Modify `docs/README.md` by adding a `bundle-corpus-index.md` guide link.
+- [ ] Modify `docs/architecture/ARCHITECTURE.md` by adding a Component Map row for `src/bundle-corpus.ts` and a Boundaries paragraph that says the subsystem reads manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
+- [ ] Append a row to `docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 unblocks disk-resident corpora for metrics and bundle triage."
+- [ ] Append ADRs 28-31 from `docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing ADRs.
+- [ ] Modify `docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed bundle listing/filtering for Spec 8. Scrub stale "Proposed", "not yet drafted", and "depends on Spec 4" language for Spec 7; Spec 4 should be described as a future consumer of the corpus picker rather than a prerequisite.
+- [ ] Add a `## 0.8.3 - 2026-04-27` entry at the top of `docs/changelog.md` with what shipped, why, validation commands, and behavior callouts for scan depth, manifest-only listing, closed corpus, incomplete-bundle `materializedEndTick`, dataUrl manifest parse cost, and sidecar bytes.
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
+$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
+Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
+```
+
+- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, and changelog mentions. No stale signatures are found during manual inspection of those hits. Spec 7 is additive, so there are no removed or renamed API names to audit beyond verifying that all new public names are covered in current docs. The final committed doc state is audited again after the devlog updates in Step 8.
+
+### Step 6: Run full engine gates
+
+- [ ] Run: `npm test`
+- [ ] Expected: all tests pass and the existing pending tests remain pending.
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
+git add src\bundle-corpus.ts src\index.ts tests\bundle-corpus.test.ts package.json src\version.ts README.md docs\api-reference.md docs\guides\bundle-corpus-index.md docs\guides\behavioral-metrics.md docs\guides\session-recording.md docs\guides\ai-integration.md docs\guides\concepts.md docs\README.md docs\architecture\ARCHITECTURE.md docs\architecture\drift-log.md docs\architecture\decisions.md docs\design\ai-first-dev-roadmap.md docs\design\2026-04-27-bundle-corpus-index-design.md docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md docs\changelog.md docs\reviews\bundle-corpus-index
+```
+
+- [ ] Create code-review iteration 1 folders:
+
+```powershell
+New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw
+git diff --staged | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\diff.md
+```
+
+- [ ] Run two independent Codex reviewers and Claude when available. Save raw outputs as `raw/codex.md`, `raw/codex-2.md`, and `raw/opus.md`. The second Codex pass follows the current handoff for this roadmap loop because Claude quota may be limited; when Claude is reachable, keep all three outputs.
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
+- [ ] Stage the generated code-review artifacts after each review iteration:
+
+```powershell
+git add docs\reviews\bundle-corpus-index-T1
+```
+
+- [ ] If a reviewer reports a real issue, fix it, rerun affected tests, rerun full gates if behavior or public docs changed, stage the updated diff plus `docs\reviews\bundle-corpus-index-T1`, and create iteration `2` with the same raw/diff/REVIEW layout. Stop when reviewers accept or only nitpick.
+- [ ] For code-review iteration `2` or later, enrich the reviewer prompt with the previous iteration's `REVIEW.md` files and `docs/learning/lessons.md`. Use this prompt header before the task-specific review text:
+
+```text
+This is Spec 7 code-review iteration <N>. Before reviewing the new staged diff, read:
+- docs/reviews/bundle-corpus-index-T1/2026-04-27/<N-1>/REVIEW.md
+- docs/learning/lessons.md
+
+Verify every real finding from the previous iteration was addressed. Do not re-flag resolved findings unless the new diff reintroduced the bug. Review the new staged diff for remaining real issues only.
+```
+
+- [ ] If code-review consensus does not converge after 3 iterations, run the Opus tie-breaker and save its output before proceeding:
+
+```powershell
+New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw
+$tieBreakerPrompt = @'
+You are the final tie-breaker for civ-engine Spec 7 Bundle Corpus Index after 3 unresolved code-review iterations. Read the staged diff, docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/2/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/3/REVIEW.md, and docs/learning/lessons.md. You must choose exactly one verdict:
+ACCEPT - the current staged diff is safe to commit and remaining reviewer objections are overridden.
+REJECT - the diff must not commit; include the mandatory prescriptive patch or exact file edits required.
+'@
+git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $tieBreakerPrompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw\opus.md
+git add docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker
+```
+
+- [ ] If the tie-breaker returns `REJECT`, apply the prescribed patch, rerun affected tests and full gates, stage the updated diff, and run one final verification review that references the tie-breaker output. If it returns `ACCEPT`, record the override in `docs/reviews/bundle-corpus-index-T1/2026-04-27/tie-breaker/REVIEW.md` and the detailed devlog entry.
+- [ ] If Claude is unreachable because of quota or model access, keep `raw/opus.md` with the error text and proceed with the two Codex outputs, documenting the unreachable Claude reviewer in `REVIEW.md` and the devlog.
+
+### Step 8: Write final devlog entries after code review convergence
+
+- [ ] Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md` with a new timestamped entry for Spec 7. Include action, code reviewer comments by provider and theme, result, reasoning, and notes. Mention the final review iteration folder.
+- [ ] Compact `docs/devlog/summary.md` before adding the Spec 7 line because the file is already above the AGENTS.md 50-line target. Preserve newest-first status for the recent Spec 1, Spec 3, Spec 8, and Spec 7 roadmap work, remove outdated repeated process chatter, then add one newest-first line: "2026-04-27 - Shipped Spec 7 Bundle Corpus Index in v0.8.3: manifest-first FileSink corpus discovery/query plus lazy bundle iteration for runMetrics."
+- [ ] Stage the devlog files:
+
+```powershell
+git add docs\devlog\detailed\2026-04-27_2026-04-27.md docs\devlog\summary.md
+```
+
+- [ ] Re-run the full doc audit against the final doc state:
+
+```powershell
+$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
+Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
+```
+
+- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, changelog, and devlog mentions. No stale signatures are found during manual inspection of those hits.
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
+- [ ] Public exports include `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
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
2026-04-28T01:56:14.558075Z  WARN codex_analytics::client: events failed with status 403 Forbidden: <html>
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
      <div class="data"><div class="main-wrapper" role="main"><div class="main-content"><noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript></div></div><script>(function(){window._cf_chl_opt = {cFPWv: 'g',cH: 'I44VQVy08p7JKidJWW3xu.qRulnkVjXHtF8HqJtmHt0-1777341374-1.2.1.1-Hq1xsUYcjOuF.5Lwi7MiMhodYSggwrQWcGyMnDNJjhetXJjDUn.f9Y8M.24zjGIe',cITimeS: '1777341374',cRay: '9f327306e807fa49',cTplB: '0',cTplC:1,cTplO:0,cTplV:5,cType: 'managed',cUPMDTk:"/backend-api/codex/analytics-events/events?__cf_chl_tk=yOBmHd5zBJng2Ol4.5fQVwe_sE_0W2gkvMUFKbEugYQ-1777341374-1.0.1.1-m5M0QGtlCUhXxmgepcH2G_sDCE0qtXgnbjQvYA4eoMo",cvId: '3',cZone: 'chatgpt.com',fa:"/backend-api/codex/analytics-events/events?__cf_chl_f_tk=yOBmHd5zBJng2Ol4.5fQVwe_sE_0W2gkvMUFKbEugYQ-1777341374-1.0.1.1-m5M0QGtlCUhXxmgepcH2G_sDCE0qtXgnbjQvYA4eoMo",md: 'N0ez38ENPvFlxFMblFyo_DvusMizh9IZF9YVNypfVPI-1777341374-1.2.1.1-KNV4BRGxs52L93p8n3YQOhIES3.CG.zOJ_6Jo2hJLHO9nufVKa32zcQrD.IDx2.ifATO4lSnCyGRTJ7aqAlyoj8Ow.XmwjuEbqzAErVqBtp827zIvXtNSR8b08pca9QTEM6_vjpEB_4yKMJMnlMtGmX86njNTv9AD7zLPgjAkIuQT9Cefv5WKjwWdv2Fzp43Q0fSw0k_EvQ2_ovjkKq9FmemL_oNc2DuxcmKpuJIViAuUWgQKPGsVLQUQM6_AZbrPjnEs6ngbivGSx36L.jjzgOnu7yLUnlKOpTf5eJYxWkiDOyBYFDctX4cgmdtQ8NrjRkBxQO3pPQEQeDa_xd_LG5wpL6cD84w6YvWpIxIiz_MtfHmAVUycZyFxX5UmuSYJd.4QbEug0thRpfEsFYg1x5huccY7laZsUBrJRvBdLX6oOW3eehx8dxdkMk6JzBytV3f0z_lgSNsTCvZgnKsnCRgriHoLcDZiQJjLKRgmsoILMy_rw2ytD6jlXGj5S5TKbf3jm4VsJwmwj3j1LNu4loUEwbJ4JltXAGpS9dLYn8Xg8f04xU4zxY0Bod0zdc0szRUYV8MjncOxGJ4xTYJz0DBpsn5b.kulqI_umimYfwedoBWRjy6WkMCRkMsGtBiPEZyp6LBHM3DVE0RPBuERBPDFfUv.A1n3CWslyDzeVRlH20ZTco7TyNIDVdWbPt.8ZHRnD758w3w9AmQd.Kx3T_hqNyPlYSa1nZoMQP1FC9.SVADE5fuFKaGs_dCWNvrH0NgnNoQRa5TjKjkRfqgFcXJtGigMbMkL6FsfhVSXw.mx4G4Hbtj4cpY4A8urYlW01YNmglrxX03CS.4gvgiha1eWLE6GzNaS10lH0dU3sMNQrnkSd.d_n_bsZ8jZZOeDdtrO_9wl4MT3ZDNpmuqyBA5brNd6LcfOkLZnSMrDhLzmyiR30V5EVzNerqiI8KfKqt0tvlGiM.Rz2Qe6QxWp1LvhnHEWnJ7AEzpepJ._i0Llx_Fb.R7qQ.814AIr_Nwa8x31ZlnVLuoIvavwd27gEnNg1iZrHWBONWICXZPOI6YBC92Bh9CMpHd6nmAMoZzKetJXSHVCADjUEq3ArD8Rw',mdrd: 'fZP7oltM_FdYhfe.mnDkyTkgqzo2w_vOSDjyHShyKFc-1777341374-1.2.1.1-c4lK60CXRGednJjLofgm4gijtPc1z0Sbnx88vAf_y_Fi6ujpCesg9OKrzqv9kp0S.hTT5ylqCAYGvvTggoM1r_gBHNswgy9F_juNQfLy8mGNFBQVV9acpuKXFfuJ97JLTLHuZ9ubrKrYdUaBmV0qIu0zQAI8TWV_vbgOf4GnczVjZb.HGc34E_BahGVC8WhmVnBlLoQwA6z61LznMpo7XyfS7uUKJsGAjT048bhQ.rlR1yHfl7faB3Z.JlaUUBIfKOOqDVoTnubhaCxuqFk3swiHx.VzHCMnKhphTCaRFNhFtZ7VC3jX5R02_TaiJEb9ByYTHC8naTuaRwCDpBickIheZ10wudC0RvisBxyKDxc4RCuN9NHfCoIQ66vGnt9jd3kKl1ZSeJ9pJDxHxmputQFkVRiiORkqvOkCB6oj3WDi8A6vCOwrC9Bq2ao2kTTjkoLRGbIqMt6I1p6M1DKKfJZ7nJdLxHJcOKHpHRYwA1aB6P08bQfqdwrKTz7tjYYkmySn6vJOMOoUxG3HeiaKwjn1bCyqvhzfuOabKwLx.od0AwWAybT40rmoqOntPibsuKwMgMlXzzBkisOcMU0WyGQok.4EVg.UKb.kVCcc7VcUBXc47POPmNFDmHpBsgERGFc3MUaVVTz0GMCK58JNzwLzKi8cXt9o_4i4GhfDPMbMXd1MKs3lRZUtZ15tbHelG1FhGrJB24KbkZKgb2h_KnavVoXzaCjegn_efgN0sf1gXtZsNUy6v54u9vDOdXpFSSkvu2PSV5qhG5VwpNbzKTGsdW1NZE7Ca188uRQUd0er9da3JtUcpBwu0sf4pGQXHzgNhHFUOwk17NZVzj7jOJtJERi_ggc_5YbgyRJu.Ku8SG3Z5xsAakl4g9KmQFd11L2M5gPDGa5kZlBja2g8I1LTA5CWRsCTj6oaIy6Lr.fdj81RjLJqvX9xXQvnfOZ4M3OW_eV7qR10L0s9tlDoJgCIU82FWX500rOVmyp7wbZ8uRBq060YuWsXfb7hi_1x6T7FnOOp1_FSo.j2FJT3UcAkrpmoRsRcR9x6ugm67.e42COKg.SDSOyXgdiOf2rIDLYDtyXl53IHgSbD5fWCmss8Wzkmpoz.HRIuPorxuoadE.uqYvYXXuAz1me7anmLPifcoq.spelQzBxeuAL2UW5HfEp38zCuzITieZp.JnZzlVDBSN5gKLypcthTYRv6qMXZxSo6ML8n7WyzdutKEn8ojA7GiwklFghuZnVD071ZmbpX9nsxT0nOcx_0caMivj8xsTzN1kvLWsjuiTOsQQu_0iACoGVCVb4T4EEjAd1RCu1I3Z1M3FjqZfnlzUS6BycHEUKVgz3esmhOv8DDChPqct8RLVgNYPhzxywloKW0y_cBPy5WJanVkz4Gig_tH0COIl7JExTvythuzwSNn8s0FCdsQXe7TBVw4G5ARlirb.96rP_yHyTWA4lCk.JjLWwGtrU96CDEEcu2m5RutwkYLzKfO8AW6FWeaBmiDop2bUvICbJd9ub28lCS4KyaYdbkJWWMfLhMl.owPDVngVBE8L2ayUa4MOxMHOqgfXQ4wUqB2SFFu2vMwmNQ3nQZAm8A2BYye_1Rud5.Uh6ntkW0MQWSPkjo21GIfYm6jLHr2Nyi9hQ._OV5wjUWRZwSh93oV39tb2aYo2tuSjoXC4mfmKUiAiSQOhxTINtYgGKSC0rT0Wj9yU_fOnPRXxTpKYZ5fIQ3nFV_X7.uyuYd0ASAmF_eUl7lL5hxnr2HggBqp2S1YQDuKiYhqE7FWwQwCAG0S0M6N97nT.gHK0.ajND95zczTCFwl99.zwUeSlyHd77xbq4A1wKrRES83ybxkjwrxgIoXQ7CPn071N9CKVKuxpfzV4FK6wecrruYL6iMUMonma4yIIxYvGGNbmDS9P9WHXlsurnyGMLONpm_1fdPhLS1xw6AGDvEVmzFjcHRw9RTuFK.RBJrfccjOGmdU9c8k._uSbrfoYtturi2E4_Yj3GxdzhUDIKYLa9r3KNv8soh.E7HeFCdozDZjyoxudvsANdsj6pnhVCpqL2PqrsAnJ30JyjPrEw_jqHCEWmWS3rKFXN69biTOJhn6fkWmuIyg1XLr6Kvxfod2.L53wrASBCUCKuYCsjbI441VJz4iDuGwFEcfqhvux7JVsoJxoDxaLJrXxlZtPvTzS5.9zMn.ryrZ65qdaYnw6Q.E3zwRe6J5OgYwceR6O0M2HFWE6m_v9LGjRft4ix21AREKKDsYaOKO_mszrKK.PtsJxSRx9FKZ6wMN49X3MJtmO4jWJ_rKVktAN6_HOJiHj_f.01RB3os.KHOOgPw207fbPHlHHstoEMx1cZiJwZle2y2wOAAe_3OZQl6C.A_8ayv_nncogRwLB_t1WrVMHAE_NQFIbmYua_CIcEhPiuRT3_63Z7wU0tggx_S6Ty.0ncYgwOUHiT2l4HsfTw9cv6AczmJYZpZzbV_68cPkV6FLsUc1qEi_nJ7YpGH0XLTdqZ2cGvtEuC2OWUm6t0aDtHhsCnJUBwIOE329T8BvkzAqwTeZC437TWxZ_AB.WS_lB9fFtaVVDFgVQNCKUQaoTboO5Hst1mUDjnsKOIDK_FWerVyB6d6SqunU8jSb8AAbLGoGuCfrhampGskD94sbCdlLvJg7e8BcX9_bKZ__ZpL6V_JB4cziFfck0yhrYSM72TWnr4IptQskVohDAbn76zwMno',};var a = document.createElement('script');a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=9f327306e807fa49';window._cf_chl_opt.cOgUHash = location.hash === '' && location.href.indexOf('#') !== -1 ? '#' : location.hash;window._cf_chl_opt.cOgUQuery = location.search === '' && location.href.slice(0, location.href.length - window._cf_chl_opt.cOgUHash.length).indexOf('?') !== -1 ? '?' : location.search;if (window.history && window.history.replaceState) {var ogU = location.pathname + window._cf_chl_opt.cOgUQuery + window._cf_chl_opt.cOgUHash;history.replaceState(null, null,"/backend-api/codex/analytics-events/events?__cf_chl_rt_tk=yOBmHd5zBJng2Ol4.5fQVwe_sE_0W2gkvMUFKbEugYQ-1777341374-1.0.1.1-m5M0QGtlCUhXxmgepcH2G_sDCE0qtXgnbjQvYA4eoMo"+ window._cf_chl_opt.cOgUHash);a.onload = function() {history.replaceState(null, null, ogU);}}document.getElementsByTagName('head')[0].appendChild(a);}());</script></div>
    </div>
  </body>
</html>
System.Management.Automation.RemoteException
2026-04-28T01:56:15.018491Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:56:15.019257Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:56:15.066251Z  WARN codex_core::plugins::manager: failed to refresh curated plugin cache after sync: failed to refresh curated plugin cache for game-studio@openai-curated: failed to back up plugin cache entry: Access is denied. (os error 5)
2026-04-28T01:56:15.214569Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:56:15.215141Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
2026-04-28T01:56:16.728551Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:56:16.729003Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
Reviewing the v5 plan against the plan-4 blocker and the existing review history first. IΓÇÖll read the relevant skill instructions, the prior plan review syntheses, and the current plan sections that govern re-review escalation before deciding whether any real blocker remains.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\reviews\\bundle-corpus-index\\2026-04-27\\plan-4\\REVIEW.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content C:\\Users\\38909\\.codex\\plugins\\cache\\openai-curated\\superpowers\\6021bacf\\skills\\using-superpowers\\SKILL.md -TotalCount 200" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path C:\\Users\\38909\\.codex\\memories\\MEMORY.md -Pattern 'civ-engine|bundle corpus|Spec 7|bundle-corpus-index'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 509ms:
# Bundle Corpus Index Implementation Plan
System.Management.Automation.RemoteException
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
System.Management.Automation.RemoteException
**Plan revision:** v5 (2026-04-27) - fixes plan-review iteration 4 findings from `docs/reviews/bundle-corpus-index/2026-04-27/plan-4/`: code-review re-review prompts must include prior `REVIEW.md` files and `docs/learning/lessons.md`, with an explicit Opus tie-breaker branch after 3 unresolved iterations.
System.Management.Automation.RemoteException
**Goal:** Implement Spec 7: Bundle Search / Corpus Index as a disk-backed manifest-first `BundleCorpus` that indexes closed FileSink bundle directories, filters metadata without loading content streams, and yields `SessionBundle`s lazily for `runMetrics`.
System.Management.Automation.RemoteException
**Architecture:** Add one focused module, `src/bundle-corpus.ts`, that owns filesystem discovery, manifest validation, immutable entry construction, query validation/filtering, and FileSink-backed bundle/source loading. The new module composes with existing session recording, FileSink, SessionReplayer, and behavioral metrics without changing their signatures.
System.Management.Automation.RemoteException
**Tech Stack:** TypeScript 5.7+, Node `fs`/`path`, Vitest 3, ESLint 9, ESM + Node16 module resolution.
System.Management.Automation.RemoteException
**Branch:** None. Commit directly to `main` after plan review, implementation, full gates, staged multi-CLI code review, and final doc updates.
System.Management.Automation.RemoteException
**Versioning:** Base is v0.8.2. Spec 7 is additive and non-breaking, so ship v0.8.3 with one coherent commit.
System.Management.Automation.RemoteException
---
System.Management.Automation.RemoteException
## File Map
System.Management.Automation.RemoteException
- Create `src/bundle-corpus.ts`: public corpus API, query helpers, manifest validation, error class, immutable entries, FileSink integration.
- Modify `src/index.ts`: export the Spec 7 public surface.
- Create `tests/bundle-corpus.test.ts`: FileSink-backed corpus tests plus focused malformed-manifest and malformed-stream cases.
- Modify `package.json`: bump `"version"` from `0.8.2` to `0.8.3`.
- Modify `src/version.ts`: bump `ENGINE_VERSION` from `'0.8.2'` to `'0.8.3'`.
- Modify `README.md`: version badge, Feature Overview row, Public Surface bullet.
- Modify `docs/api-reference.md`: add `Bundle Corpus Index (v0.8.3)` public API section.
- Create `docs/guides/bundle-corpus-index.md`: quickstart, query guide, metrics integration, replay investigation, scan depth, closed-corpus and sidecar boundaries.
- Modify `docs/guides/behavioral-metrics.md`: add disk-backed `BundleCorpus` example.
- Modify `docs/guides/session-recording.md`: add FileSink bundle indexing note.
- Modify `docs/guides/ai-integration.md`: add Tier-2 corpus query surface.
- Modify `docs/guides/concepts.md`: add `BundleCorpus` to standalone utilities.
- Modify `docs/README.md`: add guide index entry.
- Modify `docs/architecture/ARCHITECTURE.md`: Component Map row and boundary note for Bundle Corpus.
- Modify `docs/architecture/drift-log.md`: append Spec 7 drift row.
- Modify `docs/architecture/decisions.md`: append ADRs 28-31 from the accepted design.
- Modify `docs/design/ai-first-dev-roadmap.md`: mark Spec 7 implemented.
- Modify `docs/changelog.md`: add v0.8.3 entry.
- Modify `docs/devlog/summary.md`: add one newest-first Spec 7 line and keep the summary compact.
- Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md`: append the final task entry after code review artifacts exist.
- Create `docs/reviews/bundle-corpus-index-T1/2026-04-27/<iteration>/`: staged-diff code-review artifacts.
System.Management.Automation.RemoteException
## Single Task: Spec 7 - Full Surface, Tests, Docs, Review, Commit
System.Management.Automation.RemoteException
**Goal:** Land the entire Spec 7 surface in one v0.8.3 commit: tests, implementation, exports, docs, roadmap status, changelog/devlog, version bump, doc audit, gates, and staged multi-CLI code review.
System.Management.Automation.RemoteException
**Files:**
- Create: `tests/bundle-corpus.test.ts`
- Create: `src/bundle-corpus.ts`
- Modify: `src/index.ts`
- Modify: docs and version files listed in File Map
System.Management.Automation.RemoteException
### Step 1: Write failing corpus tests first
System.Management.Automation.RemoteException
- [ ] Create `tests/bundle-corpus.test.ts` with FileSink-backed fixtures. Use canonical UTC `recordedAt` values because corpus construction validates UTC-Z strings.
System.Management.Automation.RemoteException
```ts
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BundleCorpus,
  CorpusIndexError,
  FileSink,
  SessionRecordingError,
  bundleCount,
  runMetrics,
  type AttachmentDescriptor,
  type SessionMetadata,
  type SessionSnapshotEntry,
} from '../src/index.js';
System.Management.Automation.RemoteException
const roots: string[] = [];
System.Management.Automation.RemoteException
function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'civ-engine-corpus-'));
  roots.push(root);
  return root;
}
System.Management.Automation.RemoteException
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});
System.Management.Automation.RemoteException
function metadata(id: string, overrides: Partial<SessionMetadata> = {}): SessionMetadata {
  return {
    sessionId: id,
    engineVersion: '0.8.2',
    nodeVersion: 'v20.0.0',
    recordedAt: '2026-04-27T00:00:00.000Z',
    startTick: 0,
    endTick: 10,
    persistedEndTick: 10,
    durationTicks: 10,
    sourceKind: 'session',
    ...overrides,
  };
}
System.Management.Automation.RemoteException
function snapshot(tick: number): SessionSnapshotEntry {
  return {
    tick,
    snapshot: { tick } as never,
  };
}
System.Management.Automation.RemoteException
function writeBundle(dir: string, meta: SessionMetadata, attachments: AttachmentDescriptor[] = []): void {
  const sink = new FileSink(dir);
  sink.open(meta);
  sink.writeSnapshot(snapshot(meta.startTick));
  if (meta.persistedEndTick !== meta.startTick) {
    sink.writeSnapshot(snapshot(meta.persistedEndTick));
  }
  for (const attachment of attachments) {
    sink.writeAttachment(attachment, new Uint8Array([1, 2, 3]));
  }
  sink.close();
}
System.Management.Automation.RemoteException
function writeInvalidManifest(dir: string, manifest: unknown): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
System.Management.Automation.RemoteException
function expectCorpusError(fn: () => unknown, code: string): CorpusIndexError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CorpusIndexError);
    expect(error).toBeInstanceOf(SessionRecordingError);
    expect((error as CorpusIndexError).details.code).toBe(code);
    return error as CorpusIndexError;
  }
  throw new Error(`expected CorpusIndexError ${code}`);
}
```
System.Management.Automation.RemoteException
- [ ] Add discovery, ordering, and immutable-entry tests.
System.Management.Automation.RemoteException
```ts
describe('BundleCorpus discovery and entries', () => {
  it('indexes a root bundle with key "." and freezes entry metadata', () => {
    const root = tempRoot();
    writeBundle(root, metadata('root', { recordedAt: '2026-04-27T00:00:01.000Z' }));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root, { scanDepth: 'root' });
    const entries = corpus.entries();
System.Management.Automation.RemoteException
    expect(entries.map((entry) => entry.key)).toEqual(['.']);
    expect(entries[0].dir).toBe(root);
    expect(Object.isFrozen(entries[0])).toBe(true);
    expect(Object.isFrozen(entries[0].metadata)).toBe(true);
    expect(corpus.get('.')).toBe(entries[0]);
System.Management.Automation.RemoteException
    expect(() => {
      (entries[0].metadata as SessionMetadata).sessionId = 'mutated';
    }).toThrow(TypeError);
    expect(corpus.entries()[0].metadata.sessionId).toBe('root');
  });
System.Management.Automation.RemoteException
  it('honors scanDepth and sorts by recordedAt, sessionId, then key', () => {
    const root = tempRoot();
    writeBundle(join(root, 'b'), metadata('s-2', { recordedAt: '2026-04-27T00:00:02.000Z' }));
    writeBundle(join(root, 'a'), metadata('s-1', { recordedAt: '2026-04-27T00:00:02.000Z' }));
    writeBundle(join(root, 'nested', 'c'), metadata('s-0', { recordedAt: '2026-04-27T00:00:00.000Z' }));
System.Management.Automation.RemoteException
    expect(new BundleCorpus(root, { scanDepth: 'root' }).entries()).toEqual([]);
    expect(new BundleCorpus(root, { scanDepth: 'children' }).entries().map((entry) => entry.key)).toEqual(['a', 'b']);
    expect(new BundleCorpus(root, { scanDepth: 'all' }).entries().map((entry) => entry.key)).toEqual(['nested/c', 'a', 'b']);
  });
System.Management.Automation.RemoteException
  it('stops descending once a directory is a bundle', () => {
    const root = tempRoot();
    writeBundle(join(root, 'outer'), metadata('outer'));
    writeBundle(join(root, 'outer', 'nested'), metadata('nested'));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['outer']);
  });
System.Management.Automation.RemoteException
  it('uses locale-independent code-unit ordering for ties', () => {
    const root = tempRoot();
    writeBundle(join(root, 'lower'), metadata('alpha', { recordedAt: '2026-04-27T00:00:01.000Z' }));
    writeBundle(join(root, 'upper'), metadata('Zulu', { recordedAt: '2026-04-27T00:00:01.000Z' }));
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.metadata.sessionId)).toEqual(['Zulu', 'alpha']);
  });
System.Management.Automation.RemoteException
  it('skips symlinked directories when the platform permits creating them', () => {
    const root = tempRoot();
    const target = join(root, 'target');
    writeBundle(target, metadata('target'));
    try {
      symlinkSync(target, join(root, 'link'), 'junction');
    } catch {
      return;
    }
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['target']);
  });
});
```
System.Management.Automation.RemoteException
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
  it('loads bundles lazily one iterator step at a time', () => {
    const root = tempRoot();
    writeBundle(join(root, 'first'), metadata('first', { recordedAt: '2026-04-27T00:00:01.000Z' }));
    const second = join(root, 'second');
    writeBundle(second, metadata('second', { recordedAt: '2026-04-27T00:00:02.000Z' }));
    writeFileSync(join(second, 'ticks.jsonl'), '{"tick":\n{}\n');
System.Management.Automation.RemoteException
    const iterator = new BundleCorpus(root).bundles();
    const first = iterator.next();
    expect(first.done).toBe(false);
    expect(first.value.metadata.sessionId).toBe('first');
    expect(() => iterator.next()).toThrow();
  });
System.Management.Automation.RemoteException
  it('matches attachmentMime when any MIME overlaps the requested set', () => {
    const root = tempRoot();
    writeBundle(join(root, 'mixed'), metadata('mixed'), [
      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
      { id: 'trace', mime: 'application/json', sizeBytes: 3, ref: { sidecar: true } },
    ]);
System.Management.Automation.RemoteException
    const corpus = new BundleCorpus(root);
    expect(corpus.get('mixed')?.attachmentMimes).toEqual(['application/json', 'image/png']);
    expect(corpus.entries({ attachmentMime: 'application/json' }).map((entry) => entry.key)).toEqual(['mixed']);
    expect(corpus.entries({ attachmentMime: ['text/plain', 'image/png'] }).map((entry) => entry.key)).toEqual(['mixed']);
    expect(corpus.entries({ attachmentMime: ['text/plain', 'text/csv'] }).map((entry) => entry.key)).toEqual([]);
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
    const stateful = /seed/g;
    expect(corpus.entries({ key: stateful }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
    expect(stateful.lastIndex).toBe(0);
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
    expect(corpus.entries({ incomplete: true }).map((entry) => entry.key)).toEqual(['incomplete']);
    expect(corpus.entries({ incomplete: false }).map((entry) => entry.key)).toEqual(['complete']);
    expect(corpus.entries({ materializedEndTick: { max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
    expect(corpus.entries({ endTick: { min: 50 } }).map((entry) => entry.key)).toEqual(['incomplete']);
    const failedTicks = corpus.get('incomplete')!.metadata.failedTicks!;
    expect(Object.isFrozen(failedTicks)).toBe(true);
    expect(() => failedTicks.push(99)).toThrow(TypeError);
    expect(corpus.get('incomplete')!.metadata.failedTicks).toEqual([26, 27]);
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
import { SessionRecordingError } from './session-errors.js';
import { FileSink } from './session-file-sink.js';
import type { SessionSource } from './session-sink.js';
System.Management.Automation.RemoteException
const MANIFEST_FILE = 'manifest.json';
System.Management.Automation.RemoteException
export type BundleCorpusScanDepth = 'root' | 'children' | 'all';
System.Management.Automation.RemoteException
export interface BundleCorpusOptions {
  scanDepth?: BundleCorpusScanDepth;
  skipInvalid?: boolean;
}
System.Management.Automation.RemoteException
export interface NumberRange {
  min?: number;
  max?: number;
}
System.Management.Automation.RemoteException
export interface IsoTimeRange {
  from?: string;
  to?: string;
}
System.Management.Automation.RemoteException
export type OneOrMany<T> = T | readonly T[];
System.Management.Automation.RemoteException
export interface BundleQuery {
  key?: string | RegExp;
  sessionId?: OneOrMany<string>;
  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
  sourceLabel?: OneOrMany<string>;
  engineVersion?: OneOrMany<string>;
  nodeVersion?: OneOrMany<string>;
  incomplete?: boolean;
  durationTicks?: NumberRange;
  startTick?: NumberRange;
  endTick?: NumberRange;
  persistedEndTick?: NumberRange;
  materializedEndTick?: NumberRange;
  failedTickCount?: NumberRange;
  policySeed?: number | NumberRange;
  recordedAt?: IsoTimeRange;
  attachmentMime?: OneOrMany<string>;
}
System.Management.Automation.RemoteException
export type CorpusIndexErrorCode =
  | 'root_missing'
  | 'manifest_parse'
  | 'manifest_invalid'
  | 'schema_unsupported'
  | 'duplicate_key'
  | 'query_invalid'
  | 'entry_missing';
System.Management.Automation.RemoteException
export interface CorpusIndexErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: CorpusIndexErrorCode;
  readonly path: string | null;
  readonly key: string | null;
  readonly message: string | null;
}
System.Management.Automation.RemoteException
export class CorpusIndexError extends SessionRecordingError {
  override readonly details: CorpusIndexErrorDetails;
System.Management.Automation.RemoteException
  constructor(message: string, details: CorpusIndexErrorDetails) {
    super(message, details);
    this.name = 'CorpusIndexError';
    this.details = details;
  }
}
System.Management.Automation.RemoteException
export interface InvalidCorpusEntry {
  readonly path: string;
  readonly error: CorpusIndexError;
}
System.Management.Automation.RemoteException
export interface BundleCorpusEntry {
  readonly key: string;
  readonly dir: string;
  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  readonly metadata: Readonly<SessionMetadata>;
  readonly attachmentCount: number;
  readonly attachmentBytes: number;
  readonly attachmentMimes: readonly string[];
  readonly hasFailures: boolean;
  readonly failedTickCount: number;
  readonly materializedEndTick: number;
  openSource(): SessionSource;
  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
}
```
System.Management.Automation.RemoteException
- [ ] Add implementation helpers in the same file with these exact responsibilities:
System.Management.Automation.RemoteException
```ts
interface FileManifest {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  attachments: AttachmentDescriptor[];
}
System.Management.Automation.RemoteException
interface CorpusIndexErrorDetailsInput {
  readonly [key: string]: JsonValue | undefined;
  readonly code: CorpusIndexErrorCode;
  readonly path?: string;
  readonly key?: string;
  readonly message?: string;
}
System.Management.Automation.RemoteException
function normalizeDetails(input: CorpusIndexErrorDetailsInput): CorpusIndexErrorDetails {
  const details: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) details[key] = value;
  }
  details.code = input.code;
  details.path = input.path ?? null;
  details.key = input.key ?? null;
  details.message = input.message ?? null;
  return Object.freeze(details) as CorpusIndexErrorDetails;
}
System.Management.Automation.RemoteException
function corpusError(message: string, details: CorpusIndexErrorDetailsInput): CorpusIndexError {
  return new CorpusIndexError(message, normalizeDetails(details));
}
System.Management.Automation.RemoteException
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
System.Management.Automation.RemoteException
function assertCanonicalIso(value: unknown, label: string, path: string): string {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'manifest_invalid', path, message: label });
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'manifest_invalid', path, message: label });
  }
  return value;
}
System.Management.Automation.RemoteException
function validateQueryIso(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'query_invalid', message: label });
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'query_invalid', message: label });
  }
  return value;
}
System.Management.Automation.RemoteException
function assertString(value: unknown, label: string, path: string): string {
  if (typeof value !== 'string') {
    throw corpusError(`${label} must be a string`, { code: 'manifest_invalid', path, message: label });
  }
  return value;
}
System.Management.Automation.RemoteException
function assertInteger(value: unknown, label: string, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw corpusError(`${label} must be a finite integer`, { code: 'manifest_invalid', path, message: label });
  }
  return value;
}
```
System.Management.Automation.RemoteException
- [ ] Validate manifests with runtime checks instead of trusting JSON casts.
System.Management.Automation.RemoteException
```ts
function validateMetadata(value: unknown, path: string): SessionMetadata {
  if (!isRecord(value)) {
    throw corpusError('manifest metadata must be an object', { code: 'manifest_invalid', path, message: 'metadata' });
  }
  const sourceKind = value.sourceKind;
  if (sourceKind !== 'session' && sourceKind !== 'scenario' && sourceKind !== 'synthetic') {
    throw corpusError('metadata.sourceKind must be session, scenario, or synthetic', { code: 'manifest_invalid', path, message: 'sourceKind' });
  }
  const failedTicks = value.failedTicks === undefined
    ? undefined
    : Array.isArray(value.failedTicks)
      ? value.failedTicks.map((tick, index) => assertInteger(tick, `failedTicks[${index}]`, path))
      : (() => { throw corpusError('metadata.failedTicks must be an array', { code: 'manifest_invalid', path, message: 'failedTicks' }); })();
  const metadata: SessionMetadata = {
    sessionId: assertString(value.sessionId, 'sessionId', path),
    engineVersion: assertString(value.engineVersion, 'engineVersion', path),
    nodeVersion: assertString(value.nodeVersion, 'nodeVersion', path),
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
- [ ] Add a locale-independent string comparator. Use it everywhere the corpus exposes deterministic ordering.
System.Management.Automation.RemoteException
```ts
function compareCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
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
  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug> {
    return requireEntry(this._byKey, key).loadBundle<TEventMap, TCommandMap, TDebug>();
  }
System.Management.Automation.RemoteException
  [Symbol.iterator](): IterableIterator<SessionBundle> {
    return this.bundles();
  }
}
```
System.Management.Automation.RemoteException
- [ ] Implement the remaining private helpers exactly enough to satisfy the tests and design:
System.Management.Automation.RemoteException
```ts
function discoverBundleDirs(root: string, depth: BundleCorpusScanDepth): string[] {
  const out: string[] = [];
  function visit(dir: string, remaining: number | 'all'): void {
    if (existsSync(join(dir, MANIFEST_FILE))) {
      out.push(dir);
      return;
    }
    if (remaining === 0) return;
    const nextRemaining = remaining === 'all' ? 'all' : remaining - 1;
    const children = readdirSync(dir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && !dirent.isSymbolicLink())
      .map((dirent) => dirent.name)
      .sort(compareCodeUnit);
    for (const child of children) visit(join(dir, child), nextRemaining);
  }
  visit(root, depth === 'root' ? 0 : depth === 'children' ? 1 : 'all');
  return out;
}
System.Management.Automation.RemoteException
function keyForDir(root: string, dir: string): string {
  const rel = relative(root, dir);
  if (rel.length === 0) return '.';
  return rel.split(sep).join('/');
}
System.Management.Automation.RemoteException
function makeEntry(dir: string, key: string, manifest: FileManifest): BundleCorpusEntry {
  const frozenFailedTicks = manifest.metadata.failedTicks ? Object.freeze(manifest.metadata.failedTicks.slice()) : undefined;
  const metadata: Readonly<SessionMetadata> = Object.freeze({
    ...manifest.metadata,
    ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks as number[] } : {}),
  });
  const attachmentMimes = Object.freeze([...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort(compareCodeUnit));
  const materializedEndTick = metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick;
  const entry: BundleCorpusEntry = {
    key,
    dir,
    schemaVersion: manifest.schemaVersion,
    metadata,
    attachmentCount: manifest.attachments.length,
    attachmentBytes: manifest.attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0),
    attachmentMimes,
    hasFailures: (metadata.failedTicks?.length ?? 0) > 0,
    failedTickCount: metadata.failedTicks?.length ?? 0,
    materializedEndTick,
    openSource: () => new FileSink(dir),
    loadBundle: <
      TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
      TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
      TDebug = JsonValue,
    >() => new FileSink(dir).toBundle() as SessionBundle<TEventMap, TCommandMap, TDebug>,
  };
  return Object.freeze(entry);
}
System.Management.Automation.RemoteException
function compareEntries(a: BundleCorpusEntry, b: BundleCorpusEntry): number {
  return compareCodeUnit(a.metadata.recordedAt, b.metadata.recordedAt)
    || compareCodeUnit(a.metadata.sessionId, b.metadata.sessionId)
    || compareCodeUnit(a.key, b.key);
}
System.Management.Automation.RemoteException
function requireEntry(map: ReadonlyMap<string, BundleCorpusEntry>, key: string): BundleCorpusEntry {
  const entry = map.get(key);
  if (!entry) {
    throw corpusError(`corpus entry ${key} not found`, { code: 'entry_missing', key });
  }
  return entry;
}
```
System.Management.Automation.RemoteException
- [ ] Implement `compileQuery(query)` with inclusive numeric ranges, one-or-many matching, optional-field exclusion, `attachmentMime` any-match, canonical `recordedAt` bounds, and AND semantics.
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
function matchesKey(value: string, expected: string | RegExp | undefined): boolean {
  if (expected === undefined) return true;
  if (typeof expected === 'string') return value === expected;
  expected.lastIndex = 0;
  const matched = expected.test(value);
  expected.lastIndex = 0;
  return matched;
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
    if (!matchesKey(entry.key, query.key)) return false;
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
  type BundleCorpusOptions,
  type BundleCorpusEntry,
  type BundleQuery,
  type OneOrMany,
  type NumberRange,
  type IsoTimeRange,
  type CorpusIndexErrorCode,
  type CorpusIndexErrorDetails,
  type InvalidCorpusEntry,
} from './bundle-corpus.js';
```
System.Management.Automation.RemoteException
- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: PASS for the focused corpus test file.
System.Management.Automation.RemoteException
### Step 4: Add public documentation and version bump
System.Management.Automation.RemoteException
- [ ] Modify `package.json`:
System.Management.Automation.RemoteException
```json
{
  "version": "0.8.3"
}
```
System.Management.Automation.RemoteException
- [ ] Modify `src/version.ts`:
System.Management.Automation.RemoteException
```ts
export const ENGINE_VERSION = '0.8.3' as const;
```
System.Management.Automation.RemoteException
- [ ] Modify README version badge from `0.8.2` to `0.8.3`. Add a Feature Overview row for "Bundle Corpus Index" and a Public Surface bullet that names `BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, and `CorpusIndexError`.
- [ ] In `README.md`, update the existing Synthetic Playtest Harness row so it no longer says corpus indexing is "future Tier-2" work. It should say synthetic playtests produce FileSink/SessionBundle corpora that can now be indexed by `BundleCorpus` and reduced by behavioral metrics.
- [ ] Add `docs/guides/bundle-corpus-index.md` with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, `Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Incomplete Bundle Behavior`, `Sidecar Boundary`, `Embedded dataUrl Attachment Cost`, `Limitations`.
- [ ] In `docs/guides/bundle-corpus-index.md`, include this quickstart:
System.Management.Automation.RemoteException
```ts
import { BundleCorpus, bundleCount, runMetrics, sessionLengthStats } from 'civ-engine';
System.Management.Automation.RemoteException
const corpus = new BundleCorpus('artifacts/synth-corpus');
const syntheticComplete = corpus.bundles({ sourceKind: 'synthetic', incomplete: false });
const metrics = runMetrics(syntheticComplete, [bundleCount(), sessionLengthStats()]);
console.log(metrics);
```
System.Management.Automation.RemoteException
- [ ] Modify `docs/api-reference.md` with `## Bundle Corpus Index (v0.8.3)` and one subsection for each public type exported in Step 3, including `OneOrMany`. Include constructor, `entries`, `bundles`, `get`, `openSource`, `loadBundle`, and `[Symbol.iterator]` signatures exactly as accepted in the design. Document `materializedEndTick` as an incomplete-aware persisted-content horizon, not a replayability guarantee.
- [ ] In `docs/guides/bundle-corpus-index.md` and `docs/changelog.md`, explicitly document that explicit `dataUrl` attachment bytes are embedded in `manifest.json` and therefore count as manifest parse cost, not as a separate content index.
- [ ] Modify `docs/guides/behavioral-metrics.md` so the primary quickstart and corpus framing use disk-backed `BundleCorpus` with `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`. Keep in-memory `SessionBundle[]` accumulation only as a small-test or advanced note, not as the main path.
- [ ] Modify `docs/guides/session-recording.md` by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and that callers should build the corpus after sinks close.
- [ ] Modify `docs/guides/ai-integration.md` by adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
- [ ] Modify `docs/guides/concepts.md` by adding `BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
- [ ] Modify `docs/README.md` by adding a `bundle-corpus-index.md` guide link.
- [ ] Modify `docs/architecture/ARCHITECTURE.md` by adding a Component Map row for `src/bundle-corpus.ts` and a Boundaries paragraph that says the subsystem reads manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
- [ ] Append a row to `docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 unblocks disk-resident corpora for metrics and bundle triage."
- [ ] Append ADRs 28-31 from `docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing ADRs.
- [ ] Modify `docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed bundle listing/filtering for Spec 8. Scrub stale "Proposed", "not yet drafted", and "depends on Spec 4" language for Spec 7; Spec 4 should be described as a future consumer of the corpus picker rather than a prerequisite.
- [ ] Add a `## 0.8.3 - 2026-04-27` entry at the top of `docs/changelog.md` with what shipped, why, validation commands, and behavior callouts for scan depth, manifest-only listing, closed corpus, incomplete-bundle `materializedEndTick`, dataUrl manifest parse cost, and sidecar bytes.
System.Management.Automation.RemoteException
### Step 5: Run focused validation and doc audit
System.Management.Automation.RemoteException
- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: PASS.
- [ ] Run: `npm run typecheck`
- [ ] Expected: PASS with no TypeScript errors.
- [ ] Run: `npm run lint`
- [ ] Expected: PASS with no ESLint errors.
- [ ] Run this doc audit command:
System.Management.Automation.RemoteException
```powershell
$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
```
System.Management.Automation.RemoteException
- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, and changelog mentions. No stale signatures are found during manual inspection of those hits. Spec 7 is additive, so there are no removed or renamed API names to audit beyond verifying that all new public names are covered in current docs. The final committed doc state is audited again after the devlog updates in Step 8.
System.Management.Automation.RemoteException
### Step 6: Run full engine gates
System.Management.Automation.RemoteException
- [ ] Run: `npm test`
- [ ] Expected: all tests pass and the existing pending tests remain pending.
- [ ] Run: `npm run typecheck`
- [ ] Expected: PASS.
- [ ] Run: `npm run lint`
- [ ] Expected: PASS.
- [ ] Run: `npm run build`
- [ ] Expected: PASS and `dist/bundle-corpus.d.ts` plus `dist/bundle-corpus.js` are emitted by the build.
System.Management.Automation.RemoteException
### Step 7: Stage the coherent change and run multi-CLI code review
System.Management.Automation.RemoteException
- [ ] Stage only the Spec 7 implementation, tests, docs, design/review artifacts, and version files:
System.Management.Automation.RemoteException
```powershell
git add src\bundle-corpus.ts src\index.ts tests\bundle-corpus.test.ts package.json src\version.ts README.md docs\api-reference.md docs\guides\bundle-corpus-index.md docs\guides\behavioral-metrics.md docs\guides\session-recording.md docs\guides\ai-integration.md docs\guides\concepts.md docs\README.md docs\architecture\ARCHITECTURE.md docs\architecture\drift-log.md docs\architecture\decisions.md docs\design\ai-first-dev-roadmap.md docs\design\2026-04-27-bundle-corpus-index-design.md docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md docs\changelog.md docs\reviews\bundle-corpus-index
```
System.Management.Automation.RemoteException
- [ ] Create code-review iteration 1 folders:
System.Management.Automation.RemoteException
```powershell
New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw
git diff --staged | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\diff.md
```
System.Management.Automation.RemoteException
- [ ] Run two independent Codex reviewers and Claude when available. Save raw outputs as `raw/codex.md`, `raw/codex-2.md`, and `raw/opus.md`. The second Codex pass follows the current handoff for this roadmap loop because Claude quota may be limited; when Claude is reachable, keep all three outputs.
System.Management.Automation.RemoteException
```powershell
$prompt = @'
You are a senior code reviewer for civ-engine Spec 7: Bundle Search / Corpus Index. Review the staged diff only. The intent is an additive v0.8.3 API that adds BundleCorpus over closed FileSink bundle directories. Verify correctness, design, deterministic ordering, manifest validation, query validation, FileSink/runMetrics integration, tests, public exports, docs, version bump, and AGENTS.md doc discipline. Verify docs in the diff match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides. Do NOT modify files. Only return real findings with severity, explanation, and suggested fix. If there are no real issues, say ACCEPT.
'@
$jobs = @()
$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex.md } -ArgumentList $prompt
$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex-2.md } -ArgumentList $prompt
$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $prompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\opus.md } -ArgumentList $prompt
Wait-Job -Job $jobs
$jobs | Receive-Job
```
System.Management.Automation.RemoteException
- [ ] Synthesize `docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md` with provider-by-provider findings, severity, accepted/nitpick verdicts, and follow-up actions.
- [ ] Stage the generated code-review artifacts after each review iteration:
System.Management.Automation.RemoteException
```powershell
git add docs\reviews\bundle-corpus-index-T1
```
System.Management.Automation.RemoteException
- [ ] If a reviewer reports a real issue, fix it, rerun affected tests, rerun full gates if behavior or public docs changed, stage the updated diff plus `docs\reviews\bundle-corpus-index-T1`, and create iteration `2` with the same raw/diff/REVIEW layout. Stop when reviewers accept or only nitpick.
- [ ] For code-review iteration `2` or later, enrich the reviewer prompt with the previous iteration's `REVIEW.md` files and `docs/learning/lessons.md`. Use this prompt header before the task-specific review text:
System.Management.Automation.RemoteException
```text
This is Spec 7 code-review iteration <N>. Before reviewing the new staged diff, read:
- docs/reviews/bundle-corpus-index-T1/2026-04-27/<N-1>/REVIEW.md
- docs/learning/lessons.md
System.Management.Automation.RemoteException
Verify every real finding from the previous iteration was addressed. Do not re-flag resolved findings unless the new diff reintroduced the bug. Review the new staged diff for remaining real issues only.
```
System.Management.Automation.RemoteException
- [ ] If code-review consensus does not converge after 3 iterations, run the Opus tie-breaker and save its output before proceeding:
System.Management.Automation.RemoteException
```powershell
New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw
$tieBreakerPrompt = @'
You are the final tie-breaker for civ-engine Spec 7 Bundle Corpus Index after 3 unresolved code-review iterations. Read the staged diff, docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/2/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/3/REVIEW.md, and docs/learning/lessons.md. You must choose exactly one verdict:
ACCEPT - the current staged diff is safe to commit and remaining reviewer objections are overridden.
REJECT - the diff must not commit; include the mandatory prescriptive patch or exact file edits required.
'@
git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $tieBreakerPrompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw\opus.md
git add docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker
```
System.Management.Automation.RemoteException
- [ ] If the tie-breaker returns `REJECT`, apply the prescribed patch, rerun affected tests and full gates, stage the updated diff, and run one final verification review that references the tie-breaker output. If it returns `ACCEPT`, record the override in `docs/reviews/bundle-corpus-index-T1/2026-04-27/tie-breaker/REVIEW.md` and the detailed devlog entry.
- [ ] If Claude is unreachable because of quota or model access, keep `raw/opus.md` with the error text and proceed with the two Codex outputs, documenting the unreachable Claude reviewer in `REVIEW.md` and the devlog.
System.Management.Automation.RemoteException
### Step 8: Write final devlog entries after code review convergence
System.Management.Automation.RemoteException
- [ ] Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md` with a new timestamped entry for Spec 7. Include action, code reviewer comments by provider and theme, result, reasoning, and notes. Mention the final review iteration folder.
- [ ] Compact `docs/devlog/summary.md` before adding the Spec 7 line because the file is already above the AGENTS.md 50-line target. Preserve newest-first status for the recent Spec 1, Spec 3, Spec 8, and Spec 7 roadmap work, remove outdated repeated process chatter, then add one newest-first line: "2026-04-27 - Shipped Spec 7 Bundle Corpus Index in v0.8.3: manifest-first FileSink corpus discovery/query plus lazy bundle iteration for runMetrics."
- [ ] Stage the devlog files:
System.Management.Automation.RemoteException
```powershell
git add docs\devlog\detailed\2026-04-27_2026-04-27.md docs\devlog\summary.md
```
System.Management.Automation.RemoteException
- [ ] Re-run the full doc audit against the final doc state:
System.Management.Automation.RemoteException
```powershell
$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
```
System.Management.Automation.RemoteException
- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, changelog, and devlog mentions. No stale signatures are found during manual inspection of those hits.
System.Management.Automation.RemoteException
- [ ] Run: `git diff --cached --stat`
- [ ] Expected: staged files are only the coherent Spec 7 implementation, tests, docs, review artifacts, and version bump.
System.Management.Automation.RemoteException
### Step 9: Final verification and direct-to-main commit
System.Management.Automation.RemoteException
- [ ] Run final gates after the devlog update:
System.Management.Automation.RemoteException
```powershell
npm test
npm run typecheck
npm run lint
npm run build
```
System.Management.Automation.RemoteException
- [ ] Expected: all four commands pass.
- [ ] Commit directly on `main`:
System.Management.Automation.RemoteException
```powershell
git commit -m "feat: add bundle corpus index"
```
System.Management.Automation.RemoteException
- [ ] Expected: one v0.8.3 commit containing code, tests, docs, ADRs, roadmap status, changelog, devlog, review artifacts, and version bump.
System.Management.Automation.RemoteException
## Acceptance Checklist
System.Management.Automation.RemoteException
- [ ] Public exports include `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
- [ ] Construction discovers root, child, and nested FileSink bundle directories according to `scanDepth`; root bundle key is `'.'`; descendant keys use `/`.
- [ ] Discovery skips symlinked directories and stops descending inside bundle directories.
- [ ] `entries(query?)` reads manifests only and returns deterministic frozen entries in `recordedAt`, `sessionId`, `key` order.
- [ ] `bundles(query?)` and `[Symbol.iterator]` lazily load full bundles through FileSink.
- [ ] `get` returns `undefined` for missing keys; `openSource` and `loadBundle` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
- [ ] Query filters cover exact, one-or-many, numeric range, ISO range, optional field, failure count, materialized end tick, key RegExp, and attachment MIME any-match semantics.
- [ ] Invalid query and invalid manifest errors use `CorpusIndexError` with JSON-shaped `details.code`.
- [ ] `skipInvalid` records invalid manifests and omits them from entries.
- [ ] `runMetrics(corpus.bundles(query), metrics)` is covered by tests.
- [ ] Docs, ADRs, roadmap, changelog, devlog, API reference, README badge, and version bump ship in the same commit.
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass before commit.
- [ ] Multi-CLI code review artifacts exist and converge under `docs/reviews/bundle-corpus-index-T1/2026-04-27/`.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 609ms:
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
 succeeded in 644ms:
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
 succeeded in 750ms:
# Spec 7 Bundle Corpus Index Plan Review - Iteration 4
System.Management.Automation.RemoteException
**Scope:** v4 implementation plan and verification against plan-3 review findings.
System.Management.Automation.RemoteException
**Verdict:** Rejected. Codex-1 and Opus accepted, but Codex-2 found one remaining AGENTS.md process gap in the code-review re-review loop.
System.Management.Automation.RemoteException
## Raw Outputs
System.Management.Automation.RemoteException
- `raw/codex.md`
- `raw/codex-2.md`
- `raw/opus.md`
System.Management.Automation.RemoteException
Claude was reachable and returned `ACCEPT`.
System.Management.Automation.RemoteException
## Finding
System.Management.Automation.RemoteException
### High - Code-review re-review loop needs prior-review context and tie-breaker branch
System.Management.Automation.RemoteException
Codex-2 found that Step 7 says to create iteration 2 after fixes, but does not explicitly require re-review prompts to include the previous iteration's `REVIEW.md` and `docs/learning/lessons.md`. It also omits the AGENTS.md escalation path if consensus does not converge after 3 code-review iterations.
System.Management.Automation.RemoteException
**Action:** Add an iteration-2+ re-review prompt template that feeds prior `REVIEW.md` files and `docs/learning/lessons.md` into Codex/Claude, requires verification of earlier fixes, and prevents re-flagging resolved issues. Add an explicit 3-iteration tie-breaker branch using `claude --model opus` with an ACCEPT-or-REJECT prompt and a saved `tie-breaker.md` artifact.
System.Management.Automation.RemoteException
## Resolved From Iteration 3
System.Management.Automation.RemoteException
- README and roadmap stale-language cleanup is explicit.
- Behavioral metrics docs are BundleCorpus-first, with in-memory arrays demoted to small-test/advanced usage.
- Ordering uses `compareCodeUnit()` and test coverage locks host-locale-independent ties.
- Lazy bundle loading is proven with first-good, second-malformed iterator behavior.
- Discovery stop-descending behavior is covered with an outer bundle containing a nested manifest.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:56:35.064853Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:56:35.065343Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
The plan now contains the specific re-review header and an explicit Opus tie-breaker branch, so IΓÇÖm checking whether that wording fully matches AGENTS.md rather than only sounding close to it. IΓÇÖm reading the planning and general workflow skills next to make sure IΓÇÖm not missing a process-level blocker.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content C:\\Users\\38909\\.codex\\plugins\\cache\\openai-curated\\superpowers\\6021bacf\\skills\\writing-plans\\SKILL.md -TotalCount 220" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content C:\\Users\\38909\\.codex\\skills\\programming-best-practices\\SKILL.md -TotalCount 220" in C:\Users\38909\Documents\github\civ-engine
2026-04-28T01:56:51.628616Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'For code-review iteration|tie-breaker|docs/learning/lessons|REVIEW.md' -Context 2,6"` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'For code-review iteration|tie-breaker|docs/learning/lessons|REVIEW.md' -Context 2,6" in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'For code-review iteration|tie-breaker|docs/learning/lessons|REVIEW.md' -Context 2,6"` rejected: blocked by policy
 succeeded in 429ms:
---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---
System.Management.Automation.RemoteException
# Writing Plans
System.Management.Automation.RemoteException
## Overview
System.Management.Automation.RemoteException
Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.
System.Management.Automation.RemoteException
Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.
System.Management.Automation.RemoteException
**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."
System.Management.Automation.RemoteException
**Context:** This should be run in a dedicated worktree (created by brainstorming skill).
System.Management.Automation.RemoteException
**Save plans to:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)
System.Management.Automation.RemoteException
## Scope Check
System.Management.Automation.RemoteException
If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans ╞Æ?" one per subsystem. Each plan should produce working, testable software on its own.
System.Management.Automation.RemoteException
## File Structure
System.Management.Automation.RemoteException
Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.
System.Management.Automation.RemoteException
- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.
System.Management.Automation.RemoteException
This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.
System.Management.Automation.RemoteException
## Bite-Sized Task Granularity
System.Management.Automation.RemoteException
**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step
System.Management.Automation.RemoteException
## Plan Document Header
System.Management.Automation.RemoteException
**Every plan MUST start with this header:**
System.Management.Automation.RemoteException
```markdown
# [Feature Name] Implementation Plan
System.Management.Automation.RemoteException
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
System.Management.Automation.RemoteException
**Goal:** [One sentence describing what this builds]
System.Management.Automation.RemoteException
**Architecture:** [2-3 sentences about approach]
System.Management.Automation.RemoteException
**Tech Stack:** [Key technologies/libraries]
System.Management.Automation.RemoteException
---
```
System.Management.Automation.RemoteException
## Task Structure
System.Management.Automation.RemoteException
````markdown
### Task N: [Component Name]
System.Management.Automation.RemoteException
**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`
System.Management.Automation.RemoteException
- [ ] **Step 1: Write the failing test**
System.Management.Automation.RemoteException
```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```
System.Management.Automation.RemoteException
- [ ] **Step 2: Run test to verify it fails**
System.Management.Automation.RemoteException
Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"
System.Management.Automation.RemoteException
- [ ] **Step 3: Write minimal implementation**
System.Management.Automation.RemoteException
```python
def function(input):
    return expected
```
System.Management.Automation.RemoteException
- [ ] **Step 4: Run test to verify it passes**
System.Management.Automation.RemoteException
Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS
System.Management.Automation.RemoteException
- [ ] **Step 5: Commit**
System.Management.Automation.RemoteException
```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````
System.Management.Automation.RemoteException
## No Placeholders
System.Management.Automation.RemoteException
Every step must contain the actual content an engineer needs. These are **plan failures** ╞Æ?" never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code ╞Æ?" the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task
System.Management.Automation.RemoteException
## Remember
- Exact file paths always
- Complete code in every step ╞Æ?" if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
System.Management.Automation.RemoteException
## Self-Review
System.Management.Automation.RemoteException
After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself ╞Æ?" not a subagent dispatch.
System.Management.Automation.RemoteException
**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.
System.Management.Automation.RemoteException
**2. Placeholder scan:** Search your plan for red flags ╞Æ?" any of the patterns from the "No Placeholders" section above. Fix them.
System.Management.Automation.RemoteException
**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.
System.Management.Automation.RemoteException
If you find issues, fix them inline. No need to re-review ╞Æ?" just fix and move on. If you find a spec requirement with no task, add the task.
System.Management.Automation.RemoteException
## Execution Handoff
System.Management.Automation.RemoteException
After saving the plan, offer execution choice:
System.Management.Automation.RemoteException
**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Two execution options:**
System.Management.Automation.RemoteException
**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
System.Management.Automation.RemoteException
**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
System.Management.Automation.RemoteException
**Which approach?"**
System.Management.Automation.RemoteException
**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per task + two-stage review
System.Management.Automation.RemoteException
**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans
- Batch execution with checkpoints for review
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 505ms:
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
2026-04-28T01:56:52.021343Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:56:52.021829Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
I have the relevant rule now: AGENTS expects rereviewers to consider previous iterationsΓÇÖ `REVIEW.md` files, not just the immediately prior one. IΓÇÖm checking the earlier plan syntheses to confirm there isnΓÇÖt another unresolved blocker hiding underneath the plan-4 fix.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\reviews\\bundle-corpus-index\\2026-04-27\\plan-1\\REVIEW.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\reviews\\bundle-corpus-index\\2026-04-27\\plan-2\\REVIEW.md" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\reviews\\bundle-corpus-index\\2026-04-27\\plan-3\\REVIEW.md" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 422ms:
# Spec 7 Bundle Corpus Index Plan Review - Iteration 1
System.Management.Automation.RemoteException
**Scope:** `docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md` plus the accepted Spec 7 design context.
System.Management.Automation.RemoteException
**Verdict:** Rejected. The plan is directionally sound, but reviewers found one typecheck blocker and several concrete test/process/doc gaps that need a v2 plan before coding starts.
System.Management.Automation.RemoteException
## Raw Outputs
System.Management.Automation.RemoteException
- `raw/codex.md`
- `raw/codex-2.md`
- `raw/opus.md`
System.Management.Automation.RemoteException
Claude was reachable for this iteration.
System.Management.Automation.RemoteException
## Findings
System.Management.Automation.RemoteException
### High - `CorpusIndexErrorDetails` shape is not assignable to `JsonValue`
System.Management.Automation.RemoteException
Codex-2 and Opus both found that the planned interface combines `readonly [key: string]: JsonValue` with optional `path`, `key`, and `message` fields. Optional properties include `undefined`, which is not a `JsonValue`. Opus also noted that overriding `SessionRecordingError.details` with that shape fails because the base property is `JsonValue | undefined`.
System.Management.Automation.RemoteException
**Action:** Change the design and plan to use a JSON-safe details object with required nullable fields:
System.Management.Automation.RemoteException
```ts
export interface CorpusIndexErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: CorpusIndexErrorCode;
  readonly path: string | null;
  readonly key: string | null;
  readonly message: string | null;
}
```
System.Management.Automation.RemoteException
Use an internal `CorpusIndexErrorDetailsInput` helper and `normalizeDetails()` so call sites can keep passing concise optional fields while the public `details` object remains JSON-shaped.
System.Management.Automation.RemoteException
### Medium - `attachmentMime` any-match behavior is under-tested
System.Management.Automation.RemoteException
Both Codex passes found that the planned tests only cover a single-attachment PNG bundle. That would not catch an implementation that treats `attachmentMime` as exact-set or all-match, even though the accepted design requires a multi-attachment proof.
System.Management.Automation.RemoteException
**Action:** Add a test with at least two MIME types, assert single MIME and one-of-many positive matches, and assert a negative no-overlap case.
System.Management.Automation.RemoteException
### Medium - `key: RegExp` can be stateful for `/g` and `/y`
System.Management.Automation.RemoteException
Both Codex passes found that calling `query.key.test(entry.key)` directly lets global or sticky regex `lastIndex` state leak across entries.
System.Management.Automation.RemoteException
**Action:** Add global-regex test coverage and implement a `matchesKey()` helper that resets `lastIndex` before and after each test.
System.Management.Automation.RemoteException
### Medium - Doc audit is too narrow
System.Management.Automation.RemoteException
Codex-1 found that the planned doc audit scans only a handpicked subset of docs. The accepted design requires a doc-review or grep across `docs/` and `README.md`, while historical changelog/devlog/drift-log context can remain.
System.Management.Automation.RemoteException
**Action:** Replace the narrow audit with an all-markdown docs scan plus README scan for new API names. Since Spec 7 is additive, explicitly state that there are no removed/renamed API names to grep.
System.Management.Automation.RemoteException
### Medium - Accepted-design callouts are missing from concrete doc tasks
System.Management.Automation.RemoteException
Codex-2 found that the docs plan does not explicitly require `materializedEndTick` to be documented as a persisted-content horizon rather than a replay guarantee, and does not explicitly require embedded `dataUrl` attachments to be documented as manifest parse cost rather than content indexing.
System.Management.Automation.RemoteException
**Action:** Add guide/API/changelog tasks for incomplete-bundle behavior and embedded dataUrl attachment cost.
System.Management.Automation.RemoteException
### Medium - Test-count expectation is stale-prone
System.Management.Automation.RemoteException
Codex-2 noted that hardcoding the current pass count makes the plan fragile and may already conflict with current docs.
System.Management.Automation.RemoteException
**Action:** Replace the expected full-suite count with "all tests pass and existing todo tests remain todo."
System.Management.Automation.RemoteException
### Medium - Review artifacts need re-staging after generation
System.Management.Automation.RemoteException
Codex-2 and Opus found that the plan stages `docs/reviews/bundle-corpus-index-T1` before review files are generated, but does not explicitly stage the newly written raw/diff/REVIEW files before commit.
System.Management.Automation.RemoteException
**Action:** Add a re-stage step after each code-review iteration and before final verification.
System.Management.Automation.RemoteException
### Low - Two-Codex reviewer setup needs a handoff note
System.Management.Automation.RemoteException
Opus objected that `raw/codex-2.md` is not the AGENTS.md default. The handoff explicitly requires two separate Codex review passes because Claude quota may be limited.
System.Management.Automation.RemoteException
**Action:** Keep `raw/codex-2.md`, but add a note that this follows the current handoff and supplements Claude when reachable.
System.Management.Automation.RemoteException
### Low - `OneOrMany<T>` export mismatch
System.Management.Automation.RemoteException
Opus noted that the accepted design snippet exports `OneOrMany<T>`, while the implementation plan kept it module-private and omitted it from `src/index.ts`.
System.Management.Automation.RemoteException
**Action:** Export `OneOrMany<T>` and include it in docs/API/export checklist.
System.Management.Automation.RemoteException
### Low - Devlog summary compaction needs a concrete action
System.Management.Automation.RemoteException
Opus noted that the plan says to keep the summary under 50 lines, but the file is already above that threshold.
System.Management.Automation.RemoteException
**Action:** Add a concrete compaction instruction for `docs/devlog/summary.md` while preserving newest-first status lines.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 510ms:
# Spec 7 Bundle Corpus Index Plan Review - Iteration 3
System.Management.Automation.RemoteException
**Scope:** v3 implementation plan and verification against the plan-1 and plan-2 review findings.
System.Management.Automation.RemoteException
**Verdict:** Rejected. Opus accepted, but both Codex reviewers found remaining concrete issues. The remaining gaps are bounded to doc-discipline specificity and a few tests/implementation snippets.
System.Management.Automation.RemoteException
## Raw Outputs
System.Management.Automation.RemoteException
- `raw/codex.md`
- `raw/codex-2.md`
- `raw/opus.md`
System.Management.Automation.RemoteException
Claude was reachable and returned `ACCEPT`.
System.Management.Automation.RemoteException
## Findings
System.Management.Automation.RemoteException
### Medium - README and roadmap tasks still allow stale "Spec 7 is future" language
System.Management.Automation.RemoteException
Codex-1 found that the plan says to add a README row and mark the roadmap implemented, but does not explicitly remove current stale language that describes corpus indexing as future Tier-2 work or Spec 7 as proposed/not drafted.
System.Management.Automation.RemoteException
**Action:** Make the README and roadmap tasks require scrubbing stale future/proposed language: update the Synthetic Playtest README row, add the Bundle Corpus row, fix public surface bullets, revise the Spec 7 roadmap section, and update the status tracker from proposed/not drafted to implemented v0.8.3.
System.Management.Automation.RemoteException
### Medium - Behavioral metrics guide task does not replace in-memory-only framing
System.Management.Automation.RemoteException
Codex-1 found that the plan only adds a disk-backed example, while the accepted design says to replace in-memory-only corpus examples with a disk-backed `BundleCorpus` example.
System.Management.Automation.RemoteException
**Action:** Update the plan so `docs/guides/behavioral-metrics.md` uses `BundleCorpus` as the primary quickstart/framing and keeps in-memory arrays only as an optional small-test pattern.
System.Management.Automation.RemoteException
### High - Public ordering snippets use locale-dependent `localeCompare`
System.Management.Automation.RemoteException
Codex-2 found `localeCompare()` in entry sorting, attachment MIME sorting, and child discovery sorting. Default locale collation can vary across hosts, which weakens deterministic CI ordering.
System.Management.Automation.RemoteException
**Action:** Add a locale-independent `compareCodeUnit()` helper using `<` / `>` comparisons, use it for all public ordering, and add a tie-order regression test that would fail under locale-dependent case collation.
System.Management.Automation.RemoteException
### Medium - Lazy bundle iteration is not proven
System.Management.Automation.RemoteException
Codex-2 found that the planned lazy-loading test does not catch eager materialization. A `bundles()` implementation that loads all matching bundles before yielding the first one could pass.
System.Management.Automation.RemoteException
**Action:** Add a test with first bundle valid and second bundle malformed. Assert the first `iterator.next()` succeeds and only the second `iterator.next()` throws.
System.Management.Automation.RemoteException
### Medium - Stop-descending-inside-bundle discovery is not proven
System.Management.Automation.RemoteException
Codex-2 found that tests cover scan-depth limits but not the accepted contract that discovery stops once a directory is identified as a bundle directory.
System.Management.Automation.RemoteException
**Action:** Add a fixture with a nested `manifest.json` under an already indexed bundle directory and assert only the outer bundle key is indexed.
System.Management.Automation.RemoteException
## Resolved From Iteration 2
System.Management.Automation.RemoteException
- Type-compatible frozen `failedTicks` snippet was added.
- Nested `failedTicks` immutability coverage was added.
- `incomplete: true` and `incomplete: false` query coverage was added.
- Full public-name doc audit now runs after final devlog updates.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 608ms:
# Spec 7 Bundle Corpus Index Plan Review - Iteration 2
System.Management.Automation.RemoteException
**Scope:** v2 implementation plan, accepted design type correction, and verification against `docs/reviews/bundle-corpus-index/2026-04-27/plan-1/REVIEW.md`.
System.Management.Automation.RemoteException
**Verdict:** Rejected. Opus accepted, but both Codex reviewers found remaining concrete gaps. The findings are bounded and should be fixed in v3.
System.Management.Automation.RemoteException
## Raw Outputs
System.Management.Automation.RemoteException
- `raw/codex.md`
- `raw/codex-2.md`
- `raw/opus.md`
System.Management.Automation.RemoteException
Claude was reachable and returned `ACCEPT`.
System.Management.Automation.RemoteException
## Findings
System.Management.Automation.RemoteException
### High - `failedTicks` freeze snippet does not typecheck as written
System.Management.Automation.RemoteException
Codex-1 found that `makeEntry()` freezes `failedTicks` into a `readonly number[]` and then assigns it into `Readonly<SessionMetadata>`, whose nested array type remains `number[]`. That snippet can fail typecheck unless the plan specifies a narrow runtime-freeze cast or changes the public metadata type.
System.Management.Automation.RemoteException
**Action:** Keep the accepted public type `Readonly<SessionMetadata>` and update the plan snippet to build a frozen defensive array, then assign it through a narrow `as number[]` cast:
System.Management.Automation.RemoteException
```ts
const frozenFailedTicks = manifest.metadata.failedTicks
  ? Object.freeze(manifest.metadata.failedTicks.slice())
  : undefined;
const metadata: Readonly<SessionMetadata> = Object.freeze({
  ...manifest.metadata,
  ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks as number[] } : {}),
});
```
System.Management.Automation.RemoteException
This preserves the runtime contract while staying compatible with the existing `SessionMetadata` type.
System.Management.Automation.RemoteException
### Medium - Missing test coverage for `failedTicks` immutability
System.Management.Automation.RemoteException
Both Codex reviewers found that the v2 plan tests top-level metadata freezing but not the nested `failedTicks` defensive copy/freeze requirement.
System.Management.Automation.RemoteException
**Action:** Add assertions in the incomplete-bundle test that `metadata.failedTicks` is frozen, mutation throws, and later `entries()` results still expose the original `[26, 27]` list.
System.Management.Automation.RemoteException
### Medium - Missing explicit `incomplete` query coverage
System.Management.Automation.RemoteException
Codex-2 found that the test plan still does not assert `entries({ incomplete: true })` or `entries({ incomplete: false })`, even though the accepted design lists `incomplete` as a covered query filter.
System.Management.Automation.RemoteException
**Action:** Add positive and negative incomplete-filter assertions to the incomplete-bundle test.
System.Management.Automation.RemoteException
### Medium - Doc audit still omits some exported public names and runs before final docs
System.Management.Automation.RemoteException
Codex-2 found that the audit pattern omits several public exports: `BundleCorpusScanDepth`, `BundleCorpusOptions`, `NumberRange`, `IsoTimeRange`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`. It also runs before final devlog edits, so it does not audit the final committed docs state.
System.Management.Automation.RemoteException
**Action:** Expand the audit pattern to every public export and rerun the audit after final devlog updates, before the final gates/commit.
System.Management.Automation.RemoteException
## Resolved From Iteration 1
System.Management.Automation.RemoteException
- `CorpusIndexErrorDetails` is now JSON-safe and assignable to `SessionRecordingError.details`.
- Multi-MIME `attachmentMime` any-match coverage was added.
- Global-RegExp state coverage and `matchesKey()` reset behavior were added.
- The docs plan now includes materialized-end and dataUrl parse-cost callouts.
- Test-count expectations no longer hardcode stale pass counts.
- Code-review artifacts are re-staged after generation.
- The second Codex reviewer is documented as handoff-required.
- `OneOrMany<T>` is exported and documented.
- Devlog summary compaction is a concrete plan step.
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:57:01.876719Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:57:01.877193Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
IΓÇÖve confirmed the earlier findings are otherwise resolved. The remaining question is whether the v5 rereview wording truly satisfies the AGENTS rule for all prior iterations, so IΓÇÖm pulling exact line numbers around Step 7 before I give a verdict.
2026-04-28T01:57:20.036961Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$lines = Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md; for ("'$i = 0; $i -lt $lines.Length; $i++) { if ($i -ge 340 -and $i -le 430) { '"'{0,4}: {1}' -f ("'$i + 1), $lines[$i] } }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$lines = Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md; for ("'$i = 0; $i -lt $lines.Length; $i++) { if ($i -ge 340 -and $i -le 430) { '"'{0,4}: {1}' -f ("'$i + 1), $lines[$i] } }' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$lines = Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md; for ("'$i = 0; $i -lt $lines.Length; $i++) { if ($i -ge 340 -and $i -le 430) { '"'{0,4}: {1}' -f ("'$i + 1), $lines[$i] } }'` rejected: blocked by policy
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$lines = Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md; for ("'$i = 0; $i -lt $lines.Length; $i++) { if ($i -ge 820 -and $i -le 930) { '"'{0,4}: {1}' -f ("'$i + 1), $lines[$i] } }' in C:\Users\38909\Documents\github\civ-engine
 declined in 0ms:
`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$lines = Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md; for ("'$i = 0; $i -lt $lines.Length; $i++) { if ($i -ge 820 -and $i -le 930) { '"'{0,4}: {1}' -f ("'$i + 1), $lines[$i] } }'` rejected: blocked by policy
2026-04-28T01:57:20.037423Z ERROR codex_core::tools::router: error=`"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$lines = Get-Content docs'"\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md; for ("'$i = 0; $i -lt $lines.Length; $i++) { if ($i -ge 820 -and $i -le 930) { '"'{0,4}: {1}' -f ("'$i + 1), $lines[$i] } }'` rejected: blocked by policy
2026-04-28T01:57:20.459591Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:57:20.460087Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md | Select-Object -Skip 840 -First 120" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 455ms:
  return matched;
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
    if (!matchesKey(entry.key, query.key)) return false;
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
  type BundleCorpusOptions,
  type BundleCorpusEntry,
  type BundleQuery,
  type OneOrMany,
  type NumberRange,
  type IsoTimeRange,
  type CorpusIndexErrorCode,
  type CorpusIndexErrorDetails,
  type InvalidCorpusEntry,
} from './bundle-corpus.js';
```
System.Management.Automation.RemoteException
- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: PASS for the focused corpus test file.
System.Management.Automation.RemoteException
### Step 4: Add public documentation and version bump
System.Management.Automation.RemoteException
- [ ] Modify `package.json`:
System.Management.Automation.RemoteException
```json
{
  "version": "0.8.3"
}
```
System.Management.Automation.RemoteException
- [ ] Modify `src/version.ts`:
System.Management.Automation.RemoteException
```ts
export const ENGINE_VERSION = '0.8.3' as const;
```
System.Management.Automation.RemoteException
- [ ] Modify README version badge from `0.8.2` to `0.8.3`. Add a Feature Overview row for "Bundle Corpus Index" and a Public Surface bullet that names `BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, and `CorpusIndexError`.
- [ ] In `README.md`, update the existing Synthetic Playtest Harness row so it no longer says corpus indexing is "future Tier-2" work. It should say synthetic playtests produce FileSink/SessionBundle corpora that can now be indexed by `BundleCorpus` and reduced by behavioral metrics.
- [ ] Add `docs/guides/bundle-corpus-index.md` with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, `Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Incomplete Bundle Behavior`, `Sidecar Boundary`, `Embedded dataUrl Attachment Cost`, `Limitations`.
- [ ] In `docs/guides/bundle-corpus-index.md`, include this quickstart:
System.Management.Automation.RemoteException
```ts
import { BundleCorpus, bundleCount, runMetrics, sessionLengthStats } from 'civ-engine';
System.Management.Automation.RemoteException
const corpus = new BundleCorpus('artifacts/synth-corpus');
const syntheticComplete = corpus.bundles({ sourceKind: 'synthetic', incomplete: false });
const metrics = runMetrics(syntheticComplete, [bundleCount(), sessionLengthStats()]);
console.log(metrics);
```
System.Management.Automation.RemoteException
- [ ] Modify `docs/api-reference.md` with `## Bundle Corpus Index (v0.8.3)` and one subsection for each public type exported in Step 3, including `OneOrMany`. Include constructor, `entries`, `bundles`, `get`, `openSource`, `loadBundle`, and `[Symbol.iterator]` signatures exactly as accepted in the design. Document `materializedEndTick` as an incomplete-aware persisted-content horizon, not a replayability guarantee.
- [ ] In `docs/guides/bundle-corpus-index.md` and `docs/changelog.md`, explicitly document that explicit `dataUrl` attachment bytes are embedded in `manifest.json` and therefore count as manifest parse cost, not as a separate content index.
- [ ] Modify `docs/guides/behavioral-metrics.md` so the primary quickstart and corpus framing use disk-backed `BundleCorpus` with `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`. Keep in-memory `SessionBundle[]` accumulation only as a small-test or advanced note, not as the main path.
- [ ] Modify `docs/guides/session-recording.md` by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and that callers should build the corpus after sinks close.
- [ ] Modify `docs/guides/ai-integration.md` by adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
- [ ] Modify `docs/guides/concepts.md` by adding `BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
- [ ] Modify `docs/README.md` by adding a `bundle-corpus-index.md` guide link.
- [ ] Modify `docs/architecture/ARCHITECTURE.md` by adding a Component Map row for `src/bundle-corpus.ts` and a Boundaries paragraph that says the subsystem reads manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
- [ ] Append a row to `docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 unblocks disk-resident corpora for metrics and bundle triage."
- [ ] Append ADRs 28-31 from `docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing ADRs.
- [ ] Modify `docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed bundle listing/filtering for Spec 8. Scrub stale "Proposed", "not yet drafted", and "depends on Spec 4" language for Spec 7; Spec 4 should be described as a future consumer of the corpus picker rather than a prerequisite.
- [ ] Add a `## 0.8.3 - 2026-04-27` entry at the top of `docs/changelog.md` with what shipped, why, validation commands, and behavior callouts for scan depth, manifest-only listing, closed corpus, incomplete-bundle `materializedEndTick`, dataUrl manifest parse cost, and sidecar bytes.
System.Management.Automation.RemoteException
### Step 5: Run focused validation and doc audit
System.Management.Automation.RemoteException
- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:57:31.333226Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:57:31.333712Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'For code-review iteration "'`2` or later'"'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'If code-review consensus does not converge after 3 iterations'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'This is Spec 7 code-review iteration <N>'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'docs/reviews/bundle-corpus-index-T1/2026-04-27/<N-1>/REVIEW.md'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 593ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1023:- [ ] For code-review iteration `2` or later, 
enrich the reviewer prompt with the previous iteration's `REVIEW.md` files and `docs/learning/lessons.md`. Use this 
prompt header before the task-specific review text:
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 724ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1026:This is Spec 7 code-review iteration <N>. 
Before reviewing the new staged diff, read:
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 836ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1033:- [ ] If code-review consensus does not 
converge after 3 iterations, run the Opus tie-breaker and save its output before proceeding:
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 958ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1027:- 
docs/reviews/bundle-corpus-index-T1/2026-04-27/<N-1>/REVIEW.md
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:57:42.159293Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:57:42.160389Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'Read the staged diff, docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/2/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/3/REVIEW.md, and docs/learning/lessons.md'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'ACCEPT - the current staged diff is safe to commit'" in C:\Users\38909\Documents\github\civ-engine
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -Path docs\\design\\2026-04-27-bundle-corpus-index-implementation-plan.md -Pattern 'If the tie-breaker returns "'`REJECT`'"'" in C:\Users\38909\Documents\github\civ-engine
 succeeded in 505ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1038:You are the final tie-breaker for civ-engine 
Spec 7 Bundle Corpus Index after 3 unresolved code-review iterations. Read the staged diff, 
docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md, 
docs/reviews/bundle-corpus-index-T1/2026-04-27/2/REVIEW.md, 
docs/reviews/bundle-corpus-index-T1/2026-04-27/3/REVIEW.md, and docs/learning/lessons.md. You must choose exactly one 
verdict:
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
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1039:ACCEPT - the current staged diff is safe to 
commit and remaining reviewer objections are overridden.
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
 succeeded in 740ms:
System.Management.Automation.RemoteException
docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md:1046:- [ ] If the tie-breaker returns `REJECT`, 
apply the prescribed patch, rerun affected tests and full gates, stage the updated diff, and run one final 
verification review that references the tie-breaker output. If it returns `ACCEPT`, record the override in 
`docs/reviews/bundle-corpus-index-T1/2026-04-27/tie-breaker/REVIEW.md` and the detailed devlog entry.
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
Cannot set property. Property setting is supported only on core types in this language mode.
At line:1 char:1
+ [Console]::OutputEncoding=[System.Text.Encoding]::UTF8;
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [], RuntimeException
    + FullyQualifiedErrorId : PropertySetterNotSupportedInConstrainedLanguage
 
System.Management.Automation.RemoteException
2026-04-28T01:57:51.368859Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: prompt must be at most 128 characters path=C:\Users\38909\.codex\.tmp\plugins\plugins\build-ios-apps\.codex-plugin/plugin.json
2026-04-28T01:57:51.369369Z  WARN codex_core_plugins::manifest: ignoring interface.defaultPrompt: maximum of 3 prompts is supported path=C:\Users\38909\.codex\.tmp\plugins\plugins\plugin-eval\.codex-plugin/plugin.json
codex
- High - The v5 rereview template still does not fully satisfy the plan-4 / AGENTS requirement that iteration 2+ prompts include prior `REVIEW.md` files. In [docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1023>) the prose says to include prior review context, but the concrete header at [line 1026](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1026>) only feeds a single file, [line 1027](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1027>) `.../<N-1>/REVIEW.md`. That lets iteration 3 omit iteration 1 synthesis, which is weaker than the AGENTS rule that rereviewers consider previous iterationsΓÇÖ `REVIEW.md` files plus `docs/learning/lessons.md`. Fix the template to explicitly include all prior review syntheses, not just the immediately previous one.
System.Management.Automation.RemoteException
The Opus escalation path is fixed. [Line 1033](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1033>) adds the 3-iteration trigger, [line 1038](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1038>) loads iterations 1-3 plus `docs/learning/lessons.md`, and [line 1046](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1046>) defines the post-tie-breaker branch.
System.Management.Automation.RemoteException
Verdict: reject until the rereview prompt is widened from `<N-1>/REVIEW.md` to all prior `REVIEW.md` files.
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
tokens used
59,109
- High - The v5 rereview template still does not fully satisfy the plan-4 / AGENTS requirement that iteration 2+ prompts include prior `REVIEW.md` files. In [docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1023>) the prose says to include prior review context, but the concrete header at [line 1026](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1026>) only feeds a single file, [line 1027](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1027>) `.../<N-1>/REVIEW.md`. That lets iteration 3 omit iteration 1 synthesis, which is weaker than the AGENTS rule that rereviewers consider previous iterationsΓÇÖ `REVIEW.md` files plus `docs/learning/lessons.md`. Fix the template to explicitly include all prior review syntheses, not just the immediately previous one.

The Opus escalation path is fixed. [Line 1033](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1033>) adds the 3-iteration trigger, [line 1038](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1038>) loads iterations 1-3 plus `docs/learning/lessons.md`, and [line 1046](<C:/Users/38909/Documents/github/civ-engine/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md:1046>) defines the post-tie-breaker branch.

Verdict: reject until the rereview prompt is widened from `<N-1>/REVIEW.md` to all prior `REVIEW.md` files.


