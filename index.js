const express=require('express')
const app=express()
app.use(express.json())
app.use(express.static(__dirname))
const config=require('./config')
const checksumLib=require('./checksum')

app.get('/', async(req, res) => {
    res.sendFile('index.html');
});
app.post('/paynow',(req,res)=>{
    const amount=req.body.amount
    const cust_id= req.body.name.replace(/\s/g,'')
    const email=req.body.email
    const phone=req.body.phone
    if(!amount || !email || !phone){
        res.send(400).send("Payment failed")
    }
    else{
        let params={}
        params['MID']=config.PaytmConfig.mid
        params['WEBSITE']=config.PaytmConfig.website
        params['CHANNEL_ID']='WEB'
        params['INDUSTRY_TYPE_ID']='Retail'
        params['ORDER_ID']='TEST_'+new Date().getTime()
        params['CALLBACK_URL']='http://localhost:3000/callback'
        params['EMAIL']=email
        params['MOBILE_NO']=phone
        params['TXN_AMOUNT']=amount
        params['CUST_ID']=cust_id
    }
    checksumLib.genchecksum(params,config.PaytmConfig.key,function(err,checksum){
        var txn_url="https://securegw-stage.paytm.in/theia/processTransaction";
        var form_fields = "";
          for (var x in params) {
              form_fields += "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
          }
          form_fields += "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";
  
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' + txn_url + '" name="f1">' + form_fields + '</form><script type="text/javascript">document.f1.submit();</script></body></html>');
          res.end();
    })
})
app.post("/callback", (req, res) => {
    // Route for verifiying payment
  
    var body = '';
  
    req.on('data', function (data) {
       body += data;
    });
  
     req.on('end', function () {
       var html = "";
       var post_data = qs.parse(body);
  
       // received params in callback
       console.log('Callback Response: ', post_data, "\n");
  
  
       // verify the checksum
       var checksumhash = post_data.CHECKSUMHASH;
       // delete post_data.CHECKSUMHASH;
       var result = checksum_lib.verifychecksum(post_data, config.PaytmConfig.key, checksumhash);
       console.log("Checksum Result => ", result, "\n");
  
  
       // Send Server-to-Server request to verify Order Status
       var params = {"MID": config.PaytmConfig.mid, "ORDERID": post_data.ORDERID};
  
       checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {
  
         params.CHECKSUMHASH = checksum;
         post_data = 'JsonData='+JSON.stringify(params);
  
         var options = {
           hostname: 'securegw-stage.paytm.in', // for staging
           // hostname: 'securegw.paytm.in', // for production
           port: 443,
           path: '/merchant-status/getTxnStatus',
           method: 'POST',
           headers: {
             'Content-Type': 'application/x-www-form-urlencoded',
             'Content-Length': post_data.length
           }
         };
  
  
         // Set up the request
         var response = "";
         var post_req = https.request(options, function(post_res) {
           post_res.on('data', function (chunk) {
             response += chunk;
           });
  
           post_res.on('end', function(){
             console.log('S2S Response: ', response, "\n");
  
             var _result = JSON.parse(response);
               if(_result.STATUS == 'TXN_SUCCESS') {
                   res.send('payment sucess')
               }else {
                   res.send('payment failed')
               }
             });
         });
  
         // post the data
         post_req.write(post_data);
         post_req.end();
        });
       });
  });
  

const port=3000;
app.listen(port,()=>{
    console.log("server started")
})