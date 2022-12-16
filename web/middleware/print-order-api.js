/*
  The custom REST API to support the app frontend.
  Handlers combine application data from qr-codes-db.js with helpers to merge the Shopify GraphQL Admin API data.
  The Shop is the Shop that the current user belongs to. For example, the shop that is using the app.
  This information is retrieved from the Authorization header, which is decoded from the request.
  The authorization header is added by App Bridge in the frontend code.
*/

import { Shopify } from "@shopify/shopify-api";

import {
  asyncForEach,
  array_chunk
} from "../helpers/order-codes.js";
import excelJS from "exceljs"
import fetch from "node-fetch"
import moment from "moment"
import convert from 'xml-js';

const ORDER_LIST_QUERY = `
  query OrderListData($ordersFirst: Int, $ordersLast: Int, $before: String, $after: String, $sortKey: OrderSortKeys, $reverse: Boolean, $query: String, $savedSearchId: ID) {
    orders(
      first: $ordersFirst
      after: $after
      last: $ordersLast
      before: $before
      sortKey: $sortKey
      reverse: $reverse
      query: $query
      savedSearchId: $savedSearchId
    ) {
      edges {
        cursor
        node {
          id
          name
          closed
          cancelledAt
          processedAt
          note
          hasTimelineComment
          displayFinancialStatus
          displayFulfillmentStatus
          lineItems(first: 10) {
            nodes {
              name
              quantity
              variant {
                price
              }
              variantTitle
            }
          }
          shippingLine {
            id
            title
            __typename
          }
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
              __typename
            }
            presentmentMoney {
              amount
              currencyCode
              __typename
            }
            __typename
          }
          currentSubtotalLineItemsQuantity
          tags
          customer {
            id
            email
            firstName
            lastName
            __typename
          }
          __typename
        }
        __typename
      }
      pageInfo {
        hasPreviousPage
        startCursor
        hasNextPage
        endCursor
        __typename
      }
      __typename
    }
  }
`;

const REPORT_LIST_QUERY = `
  query ReportListData($ordersFirst: Int, $ordersLast: Int, $before: String, $after: String, $sortKey: OrderSortKeys, $reverse: Boolean, $query: String, $savedSearchId: ID) {
    orders(
      first: $ordersFirst
      after: $after
      last: $ordersLast
      before: $before
      sortKey: $sortKey
      reverse: $reverse
      query: $query
      savedSearchId: $savedSearchId
    ) {
      edges {
        cursor
        node {
          id
          name
          lineItems(first: 50) {
            nodes {
              name
              quantity
              variant {
                price
              }
              variantTitle
            }
          }
          shippingLine {
            id
            title
            __typename
          }
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
              __typename
            }
            presentmentMoney {
              amount
              currencyCode
              __typename
            }
            __typename
          }
          currentSubtotalLineItemsQuantity
          tags
          customer {
            id
            email
            firstName
            lastName
            __typename
          }
          __typename
        }
        __typename
      }
      pageInfo {
        hasPreviousPage
        startCursor
        hasNextPage
        endCursor
        __typename
      }
      __typename
    }
  }
`;

const DOWNLOAD_LIST_QUERY = `
  query DownloadListData($query: String, $savedSearchId: ID) {
    orders(
      first: 10
      reverse: true
      query: $query
      savedSearchId: $savedSearchId
    ) {
      edges {
        cursor
        node {
          id
          name
          lineItems(first: 10) {
            nodes {
              name
              quantity
              variant {
                price
              }
              variantTitle
            }
          }
          shippingLine {
            id
            title
            __typename
          }
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
              __typename
            }
            presentmentMoney {
              amount
              currencyCode
              __typename
            }
            __typename
          }
          currentSubtotalLineItemsQuantity
          tags
          customer {
            id
            email
            firstName
            lastName
            __typename
          }
          __typename
        }
        __typename
      }
      pageInfo {
        hasPreviousPage
        startCursor
        hasNextPage
        endCursor
        __typename
      }
      __typename
    }
  }
`;

const ADD_CARGO_TRACKING_NUMBER = `
mutation tagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`;


let session={"shop": "testaddictapp.myshopify.com" , "accessToken": "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", isActive: ()=>{return true}}

export default function applyPrintOrderApiEndpoints(app) {

  app.post("/api/ordersList", async (req, res) =>{ 
    // const session = await Shopify.Utils.loadCurrentSession(
    //   req,
    //   res,
    //   app.get("use-online-tokens")
    // );
    if (!session) {
      res.status(401).send("Could not find a Shopify session");
      return;
    }

    const client = new Shopify.Clients.Graphql(
      session.shop,
      session.accessToken
    );
    
    // Get orders
    const ordersList = await client.query({
      data: {
        query: ORDER_LIST_QUERY,
        variables: req.body.variables,
      },
    });
    const ret = {
      ordersList: ordersList,
      session: session,
    }

    res.status(200).send(ret);
  });

  app.post("/api/reportsList", async (req, res) =>{
    // const session = await Shopify.Utils.loadCurrentSession(
    //   req,
    //   res,
    //   app.get("use-online-tokens")
    // );
    
    if (!session) {
      res.status(401).send("Could not find a Shopify session");
      return;
    }

    const client = new Shopify.Clients.Graphql(
      session.shop,
      session.accessToken
    );
    
    // Get orders
    let next = true;
    let ordersList = [];
    let variables = req.body.variables
    while(next == true) {
      const subList = await client.query({
        data: {
          query: ORDER_LIST_QUERY,
          variables: variables,
        },
      });
      next = subList.body.data.orders.pageInfo.hasNextPage;
      variables = {
        ordersFirst: 10,
        sortKey: "PROCESSED_AT",
        reverse: true,
        query: "Cargo Tracking: fulfillment_status:\"unshipped\"",
        after: subList.body.data.orders.pageInfo.endCursor,
      }
      ordersList.push(subList);
    }

    res.status(200).send(ordersList);
  })


  app.post("/api/downloadExcel", async (req, res) => {
    // const session = await Shopify.Utils.loadCurrentSession(
    //   req,
    //   res,
    //   app.get("use-online-tokens")
    // );

    if (!session) {
      res.status(401).send("Could not find a Shopify session");
      return;
    }

    const client = new Shopify.Clients.Graphql(
      session.shop,
      session.accessToken
    );
    
    // Get orders
    const retGql = await client.query({
      data: {
        query: DOWNLOAD_LIST_QUERY,
        variables: req.body.variables,
      },
    })

    const workbook = new excelJS.Workbook();  // Create a new workbook
    const worksheet = workbook.addWorksheet("reports");

    worksheet.columns = [
      { header: "של", key: "there", width: 30 }, 
      { header: "מספר הזמנה", key: "shipping_num", width: 30 },
      { header: "מספר הזמנהShopify", key: "order_num", width: 30 },
      { header: "כמות", key: "qty", width: 30 },
      { header: "מחיר ליחידה", key: "price", width: 30 },
    ];
    retGql.body.data.orders.edges.forEach((order) => {
      const report = {}
      let cargoN
			order.node.tags.map(t => {
				if (t.indexOf('Cargo') > -1) cargoN = t.split(':')[1]
			})

      order.node.lineItems.nodes.map(t1 => {
        report.there = t1.name
        report.shipping_num = cargoN
        report.order_num = order?.node?.id?.slice(20, order?.node?.id?.length)
        report.qty = t1.quantity
        report.price = t1.variant.price
      })

      worksheet.addRow(report); // Add data in worksheet
    });

    // res is a Stream object
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "tutorials.xlsx"
    );

    workbook.xlsx.write(res).then(function () {
      res.status(200).send();
    });
  })


  app.post("/api/printLabel", async (req, res) => {
    // const session = await Shopify.Utils.loadCurrentSession(
    //   req,
    //   res,
    //   app.get("use-online-tokens")
    // );
    const {Order, Page } = await import (`@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`);

    let ids = '';
    let selIds = req.body.selIds;
    let len = selIds.length;
    for(let i = 0; i<len; i++){
      ids += selIds[i].id.toString();
      if (i< len -1) ids += ','

    }

    const orders= await Order.all({
      session: session,
      //status: "any",
      ids,
    });

    let html = `
      <link rel="stylesheet" href="https://allwp.addictonline.co.il/wp-content/themes/matat-child/template/labels.css"></link>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
      <script src="https://cdn.jsdelivr.net/jsbarcode/3.6.0/JsBarcode.all.min.js"></script>
      <style type="text/css">
        body > div,
        body > a,
        body > iframe,
        .main-page-title {
          display:none !important;
        }

        tr{
          word-break: break-word;
        }

        /* Print Styles */
        @media print {
          @page {
            size: auto;
            padding: 0 !important;
            margin: 0 !important;
          }

          @page :footer {
            display: none;
            padding: 0 !important;
            margin: 0 !important;
          }

          @page :header {
            display: none;
            padding: 0 !important;
            margin: 0 !important;
          }

          html, body {
            padding: 0 !important;
            margin: 0 !important;
          }

          .sticker-page-wrapper1,
          .sticker-page-wrapper2,
          .sticker-page-wrapper3 {
            page-break-before: always;
            font-size: 14px !important;
            height: 100%;
            padding-top: 1.7em !important;
          }

          .sticker-page-wrapper1 .bar-code,
          .sticker-page-wrapper2 .bar_code_wrap,
          .sticker-page-wrapper3 .bar-code {
            padding-top: 0 !important;
          }

          .sticker-page-wrapper3 .middle-content {
            font-size: 1.25em !important;
          }

          .sticker_wrapper {
            box-sizing: border-box;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }

        .bottom_date {
          float: left !important;
        }

        .sticker-page-wrapper1 {
          box-sizing: border-box;
          -webkit-text-size-adjust: 100%;
        }

        .sticker-page-wrapper1 *, .sticker-page-wrapper1 *:before, .sticker-page-wrapper1 *:after {
          box-sizing: inherit;
        }

        .sticker-page-wrapper1 {
          direction: rtl;
          color: #000;
          background: #fff;
          font: 2.941176471vw/1.5 'Heebo', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          margin: 0;
        }

        @media (min-width: 544px) {
          .sticker-page-wrapper1 {
            font-size: 16px;
          }
        }

        .sticker-page-wrapper1 .sticker_wrapper {
          max-width: 35.3125em;
          margin: 0 auto;
          padding: 0 1em 5.625em;
          position: relative;
          min-height: 100vh;
        }

        .sticker-page-wrapper1 img {
          vertical-align: top;
          max-width: 100%;
          height: auto;
        }

        .sticker-page-wrapper1 .sticker_date {
          font-weight: 500;
          text-align: center;
          padding: 0.1875em;
        }

        .sticker-page-wrapper1 .bar-code {
          margin: 0 auto;
          width: 14.4375em;
          padding: 1em 0;
        }

        .sticker-page-wrapper1 .bar-code img {
          width: 100%;
        }

        .sticker-page-wrapper1 table {
          width: 100%;
          border: 1px solid #000;
          border-collapse: collapse;
        }

        .sticker-page-wrapper1 table th,
        .sticker-page-wrapper1 table td {
          border: 1px solid #000;
          padding: 0.5em 1.25em 0.4375em;
        }

        .sticker-page-wrapper1 table tbody th {
          width: 55.2%;
          text-align: right;
          font-weight: 500;
        }

        .sticker-page-wrapper1 table tbody td {
          padding-right: 2.125em;
        }

        .sticker-page-wrapper1 tfoot td {
          background: #eaebeb;
          text-align: center;
        }

        .sticker-page-wrapper1 .bottom-logo {
          margin: 0 auto;
          width: 20vw;
          bottom: 3.8125em;
          position: absolute;
          left: 0;
          right: 0;
        }

        .sticker-page-wrapper1 .bottom-logo img {
          width: 100%;
        }
        .sticker-page-wrapper2 {
          box-sizing: border-box;
          -webkit-text-size-adjust: 100%;
        }

        .sticker-page-wrapper2 *, .sticker-page-wrapper2 *:before, .sticker-page-wrapper2 *:after {
          box-sizing: inherit;
        }

        .sticker-page-wrapper2 {
          direction: rtl;
          color: #000;
          background: #fff;
          font: 2.941176471vw/1.5 'Heebo', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          margin: 0;
        }

        @media (min-width: 544px) {
          .sticker-page-wrapper2 {
            font-size: 16px;
          }
        }

        .sticker-page-wrapper2 .sticker_wrapper {
          max-width: 35.3125em;
          margin: 0 auto;
          padding: 0 1em 5.625em;
          position: relative;
          min-height: 100vh;
        }

        .sticker-page-wrapper2 img {
          vertical-align: top;
          max-width: 100%;
          height: auto;
        }

        .sticker-page-wrapper2 .sticker_date {
          font-weight: 500;
          text-align: center;
          padding: 0.5em;
        }

        .sticker-page-wrapper2 .bar_code_wrap {
          display: flex;
          padding: 0.5em 0 1em;
        }

        .sticker-page-wrapper2 .order_detail_info {
          padding: 0.1875em 0.875em;
        }

        .bar-code {
          margin: 0 auto 0 0;
          width: 14.125em;
        }

        .sticker-page-wrapper2 .bar-code img {
          width: 100%;
        }

        .sticker-page-wrapper2 table {
          width: 100%;
          border: 2px solid #000;
          border-collapse: collapse;
          font-size: 0.875em;
          margin: 0 0 1.3571em;
        }

        .sticker-page-wrapper2 table th,
        .sticker-page-wrapper2 table td {
          border: 1px solid #000;
        }

        .sticker-page-wrapper2 table .sku {
          width: 7.75em;
        }

        .sticker-page-wrapper2 table .amount {
          width: 4.1667em;
        }

        .sticker-page-wrapper2 table .item_name {
          width: 20em;
        }

        .sticker-page-wrapper2 table .return {
          width: 4.5em;
        }

        .sticker-page-wrapper2 .text-center {
          text-align: center !important;
        }

        .sticker-page-wrapper2 table .reason_code {
          width: 7.25em;
        }

        .sticker-page-wrapper2 table thead td,
        .sticker-page-wrapper2 table thead th {
          text-align: right;
          font-size: 0.75em;
          font-weight: 500;
          padding: 0.6667em;
        }

        .sticker-page-wrapper2 table tbody td {
          padding: 0.5714em 0.52em 0.53em;
        }

        .sticker-page-wrapper2 .form_title {
          display: block;
          margin: 0 0 0.4375em;
        }

        .sticker-page-wrapper2 .checkbox_wrap {
          display: inline-block;
          vertical-align: top;
          text-align: right;
          position: relative;
          margin: 0 1.0625em;
        }

        .sticker-page-wrapper2 .checkbox_wrap label {
          display: inline-block;
          vertical-align: top;
          padding-right: 1.9375em;
        }

        .sticker-page-wrapper2 .checkbox_wrap label input[type="checkbox"] {
          position: absolute;
          top: 0;
          right: 0;
          opacity: 0;
        }

        .sticker-page-wrapper2 .checkbox_wrap label input[type="checkbox"]:checked ~ .fake-input:before {
          opacity: 1;
        }

        .sticker-page-wrapper2 .checkbox_wrap .fake-input {
          position: absolute;
          top: 0;
          right: 0;
          width: 1.4375em;
          height: 1.4375em;
          border: 2px solid #000;
        }

        .sticker-page-wrapper2 .checkbox_wrap .fake-input:before {
          content: '';
          position: absolute;
          border: 2px solid #000;
          border-width: 0 2px 2px 0;
          width: 0.4375em;
          height: 0.875em;
          top: 45%;
          right: 50%;
          opacity: 0;
          transition: 0.25s ease opacity;
          -webkit-transform: translate(50%, -50%) rotate(45deg);
          -moz-transform: translate(50%, -50%) rotate(45deg);
          -ms-transform: translate(50%, -50%) rotate(45deg);
          -o-transform: translate(50%, -50%) rotate(45deg);
          transform: translate(50%, -50%) rotate(45deg);
        }

        .sticker-page-wrapper2 .bottom-info {
          font-size: 0.75em;
          padding: 0.25em 0 0.6667em;
        }

        .sticker-page-wrapper2 textarea.notes_input {
          display: block;
          width: 100%;
          resize: none;
          border: 1px solid #000;
          color: #000;
          background: #eaebeb;
          font: 500 1em/1 'Heebo', sans-serif;
          height: 2.625em;
          padding: 0.6875em 0.875em;
        }

        .sticker-page-wrapper2 .bottom-logo {
          margin: 0 auto;
          width: 20vw;
          bottom: 3.8125em;
          position: absolute;
          left: 0;
          right: 0;
        }

        .sticker-page-wrapper2 .bottom-logo img {
          width: 100%;
        }
        .sticker-page-wrapper3 {
          box-sizing: border-box;
          -webkit-text-size-adjust: 100%;
        }

        .sticker-page-wrapper3 *, .sticker-page-wrapper3 *:before, .sticker-page-wrapper3 *:after {
          box-sizing: inherit;
        }

        .sticker-page-wrapper3 {
          direction: rtl;
          color: #000;
          background: #fff;
          font: 2.941176471vw/1.5 'Heebo', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          margin: 0;
        }

        @media (min-width: 544px) {
          .sticker-page-wrapper3 {
            font-size: 16px;
          }
        }

        .sticker-page-wrapper3 .sticker_wrapper {
          max-width: 35.3125em;
          margin: 0 auto;
          padding: 0 1em 5.625em;
          position: relative;
          min-height: 100vh;
        }

        .sticker-page-wrapper3 img {
          vertical-align: top;
          max-width: 100%;
          height: auto;
        }

        .sticker-page-wrapper3 .bar-code {
          margin: 0 auto;
          width: 24.4375em;
          padding: 1em 0;
        }

        .sticker-page-wrapper3 .bar-code img {
          /* width: 100%; */
          width: auto;
          display: block;
        }

        .sticker-page-wrapper3 .top-info-text {
          text-align: center;
          border: 1px solid #000;
          background: #eaeceb;
          padding: 0.3333em 0.5em 0.4583em;
          font-size: 1.24em;
          line-height: 1.6667;
        }

        .sticker-page-wrapper3 .top-info-text strong {
          font-weight: 500;
          display: block;
        }

        .sticker-page-wrapper3 .middle-content {
          font-size: 1.24em;
          line-height: 1.8958;
          padding: 2.2083em 0.3333em 1.125em;
        }

        .sticker-page-wrapper3 strong {
          font-weight: 500;
        }

        .sticker-page-wrapper3 .middle-content .title-text {
          display: block;
          font-size: 1.1667em;
          line-height: 1.5;
          margin-bottom: 0.0714em;
        }

        .sticker-page-wrapper3 .bottom-info-text {
          text-align: center;
          border: 1px solid #000;
          background: #eaeceb;
          font-size: 1.24em;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          line-height: 1.9167;
          padding: 0.25em 0 0.375em;
        }

        .sticker-page-wrapper3 .bottom-info-text .data {
          margin: 0 0.75em;
        }

        .sticker-page-wrapper3 .bottom-logo {
          margin: 0 auto;
          width: 20vw;
          bottom: 3.8125em;
          position: absolute;
          left: 0;
          right: 0;
        }

        .sticker-page-wrapper3 .bottom-logo img {
          width: 100%;
        }
      </style>
    `;
    
    let devnum = '', ordernum = '';
    await asyncForEach(orders, async (order) => {
      
      let order_billing_first_name = order.billing_address.first_name;
      let order_billing_last_name = order.billing_address.last_name;
      let billing_address_1 = order.billing_address.address1;
      let billing_address_2 = order.billing_address.address2;
      let billing_phone = order.billing_address.phone;
      let city = order.billing_address.city;
      let note = order.customer.note ? order.customer.note : "";
      let shopify_order_id = order.id;
      let items = order.line_items;
      let time_now = moment(new Date()).format('YYYY-MM-DD');
      let lb_num_from = 3;
      if(items.length > 6 ) lb_num_from = 2 + Math.ceil(items/6);

      const apiUrl = "http://185.241.7.143/Baldarp/Service.asmx";

      let ship_data ={
        type: '1',
        collect_street: "יוחנן הסנדלר",
        collect_street_number: 5,
        collect_city: "הרצליה",
        street: order.shipping_address.address1,
        number: order.shipping_address.address2,
        city: order.shipping_address.city,
        company: order.shipping_address.company ? order.shipping_address.company : '',
        note: note,
        urgent: '1',
        tapuz_static: '0',
        tapuz_empty: '',
        motor: '1',
        packages: '1',
        return: '1',
        woo_id: order.id,
        extra_note: '',
        contact_name: order.shipping_address.first_name + ' ' + order.shipping_address.last_name,
        contact_phone: order.shipping_address.phone,
        contact_mail: order.contact_email,
        exaction_date: moment(new Date()).format('YYYY-MM-DD'),
        collect: '',
        delivery_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
      }
      
      let devnum_idx = -1;
      let kav_idx = -1;
      let kav = '';
      let formBody = [];
      formBody.push(ship_data.type);
      formBody.push(ship_data.collect_street);
      formBody.push(ship_data.collect_street_number);
      formBody.push(ship_data.collect_city);
      formBody.push(ship_data.street);
      formBody.push(ship_data.number);
      formBody.push(ship_data.city);
      formBody.push(ship_data.collect_company);
      formBody.push(ship_data.company);
      formBody.push(ship_data.note);
      formBody.push(ship_data.urgent);
      formBody.push(ship_data.tapuz_static);
      formBody.push(ship_data.motor);
      formBody.push(ship_data.packages);
      formBody.push(ship_data.return);
      formBody.push(ship_data.tapuz_static);
      formBody.push(ship_data.woo_id);
      formBody.push(ship_data.code);
      formBody.push(ship_data.tapuz_static);
      formBody.push(ship_data.extra_note);
      formBody.push(ship_data.tapuz_static);
      formBody.push(ship_data.tapuz_empty);
      formBody.push(ship_data.tapuz_empty);
      formBody.push(ship_data.contact_name);
      formBody.push(ship_data.contact_phone);
      formBody.push(ship_data.contact_mail);
      formBody.push(ship_data.exaction_date);
      formBody.push(ship_data.collect);

      formBody = formBody.join(";");
     
      const response = await fetch(
        `${apiUrl}/SaveData1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: encodeURIComponent("pParam")+"="+encodeURIComponent(formBody),
        }
      ).then(response => response.text())
      let result = JSON.parse(convert.xml2json(response,{compact: true, spaces: 2}));
      devnum = parseInt(result.SaveDataResult.DeliveryNumber._text);
      ordernum = "RR" + order.id;

      let cargoStatus = false;
      cargoStatus = order.tags.includes('Cargo');

      if (!cargoStatus)
      {
        const client = new Shopify.Clients.Graphql(
          session.shop,
          session.accessToken
        );
  
        const addTags = await client.query({
          data: {
            query: ADD_CARGO_TRACKING_NUMBER,
            variables: {
              id: order.admin_graphql_api_id,
              tags: 'Cargo Tracking:' + devnum,           
            },
          },
        });
      }   

      html += `
      <div class="sticker-page-wrapper1">
				<div class="sticker_wrapper">
          <div class="bar-code">
						<img class="bar-code-dev" src="">
					</div>
					<table>
						<tbody>
							<tr>
								<th>מאת ADDICT</th>
								<td><div style="float:right">${order.id}</div></td>
							</tr>
							<tr>
								<th>יוחנן הסנדלר 5 הרצליה</th>
								<td>מ-1-1</td>
							</tr>
							<tr>
								<th>
									עבור: ${order_billing_first_name} ${order_billing_last_name}
								</th>
								<td>
									${billing_address_1} ${billing_address_2} ${city}
								</td>
							</tr>
							<tr>
								<th>מספר קו</th>
								<td>${kav}</td>
							</tr>
							<tr>
								<th> טלפון: ${billing_phone}</th>
								<td>רגיל</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<td colspan="2">
                ${billing_address_1} ${billing_address_2} ${city} &nbsp;|&nbsp; טלפון: ${billing_phone} &nbsp;|&nbsp;  הערות: ${note}
								</td>
							</tr>
						</tfoot>
					</table>
					<div class="bottom-logo">
						<img src="https://allwp.addictonline.co.il/wp-content/webp-express/webp-images/doc-root/wp-content/themes/matat-child/assets/label/logo.png.webp" alt="addict">
					</div>
					<div>1 מתוך ${lb_num_from} <span class="bottom_date">${time_now}</span></div>
				</div>
			</div>`

			let lb_num = 2;
			array_chunk(items,6).forEach((items_data) => {

        html += `
        <div class="sticker-page-wrapper2">
					<div class="sticker_wrapper">
						<div class="bar_code_wrap">
							<div class="order_detail_info">
								<div class="data_row">
									<strong>עבור:</strong>${order_billing_first_name} ${order_billing_last_name}
								</div>
								<div class="data_row"><strong>מס׳ הזמנה:</strong>${order.id}</div>
							</div>
							<div class="bar-code">
                <img class="bar-code-dev" src="">
							</div>
						</div>
            <strong class="form_title text-center">נא סמני ב- "X" איזה פריט את מחזירה וצרפי את המדבקה הנ"ל לתוך החבילה</strong>
            <table>
							<thead>
								<tr>
									<th class="sku">מק׳׳ט</th>
									<th class="amount text-center">כמות</th>
									<th class="item_name">שם פריט</th>
									<th class="return text-center">החזרה</th>
									<th class="reason_code">קוד סיבת החזרה</th>
								</tr>
							</thead>
							<tbody>`;

                items_data.forEach((item) => {
                  let product_idx = item.sku ? item.sku : item.product_id;
                  html +=`
                  <tr>
										<td class="text-center">&nbsp;${product_idx}</td>
										<td>&nbsp;${item.quantity}</td>
										<td class="text-center">&nbsp;${item.name}
										<td>&nbsp;</td>
									</tr>`;

                });

              html +=`
							</tbody>
						</table>
						<form action="#">
							<strong class="form_title text-center">סמני כיצד תרצי לקבל את הזיכוי:</strong>
							<div class="checkbox-row text-center">
								<div class="checkbox_wrap">
									<label>
										<input type="checkbox">
										<span class="fake-input"></span>
										<span class="label-text">זיכוי כספי</span>
									</label>
								</div>
								<div class="checkbox_wrap">
									<label>
										<input type="checkbox">
										<span class="fake-input"></span>
										<span class="label-text">קרדיט באתר</span>
									</label>
								</div>
							</div>
							<div class="bottom-info text-center">החזר כספי בניכוי של 5% משווי הפריט *</div>
							<textarea class="notes_input" placeholder="הערות נוספות:"></textarea>
						</form>
						<div>${lb_num} מתוך ${lb_num_from}<span class="bottom_date">${time_now}</span></div>
						<div class="bottom-logo">
              <img src="https://allwp.addictonline.co.il/wp-content/webp-express/webp-images/doc-root/wp-content/themes/matat-child/assets/label/logo.png.webp" alt="addict">
						</div>
					</div>
				</div>`;
        lb_num ++;
      });
      
      html +=`
			<div class="sticker-page-wrapper3">
				<div class="sticker_wrapper">
          <div class="bar-code">
            <img class="bar-code-order" src="">
          </div>
					<div class="top-info-text">
						תגוביינא רשום מיוחד- אין צורך בבול <strong>אישור מס׳ 16941</strong>
					</div>
					<div class="middle-content">
						<strong class="title-text">לכבוד:</strong>
						אדיקט נ.א בע"מ <br>
						באמצעות בית הדואר <strong>רמת השרון</strong> <br>
						תא דואר <strong>1771</strong> <br>
						רמת השרון <strong>4710001</strong>
					</div>
					<div class="bottom-info-text">
						<div class="data">
							<strong>שם לקוח:</strong> ${order_billing_first_name} ${order_billing_last_name}
						</div>
						<div class="data">
							<strong>מס׳ הזמנה:</strong> ${order.id}
						</div>
					</div>
					<div style="display:inline-block">${lb_num} מתוך ${lb_num_from}</div>
            <div style="display:inline-block; float:left"> ${shopify_order_id}</div>
          <div class="bottom-logo">
            <img src="https://allwp.addictonline.co.il/wp-content/webp-express/webp-images/doc-root/wp-content/themes/matat-child/assets/label/logo.png.webp" alt="addict">
          </div>
				</div>
			</div>`;
    })

    html +=`
    <script>
      function init() {
        $('head').html('');
      }

      init();

      function textToBase64Barcode(text){
        var canvas = document.createElement("canvas");
        JsBarcode(canvas, text, {
          format: "CODE39",
          height: 100,
          fontSize: 25,
          displayValue: true,
          textAlign: "right"
        });
        return canvas.toDataURL("image/png");
      }
      $('.bar-code-dev').attr('src', textToBase64Barcode('` + devnum + `'));
      $('.bar-code-order').attr('src', textToBase64Barcode('` + ordernum + `'));
    </script>
    `

    const pages= await Page.all({
      session: session,
    });
  
    let isExisted = -1;
    isExisted = pages.findIndex((item) => item.title == "print_label");

    if(isExisted < 0 ) 
    {
      const page = new Page({session: session});
      page.title = "print_label";
      page.body_html = html;

      await page.save({
        update: true,
      });
    } else {
      const page = pages[isExisted];
      page.body_html = html;

      await page.save({
        update: true,
      });

    }
    res.status(200).send();
    
  });
}
