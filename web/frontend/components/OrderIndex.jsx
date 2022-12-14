import { useNavigate } from "@shopify/app-bridge-react";
import {
  Card,
  IndexTable,
  Stack,
  TextStyle,
  UnstyledLink,
  useIndexResourceState,
  Tag
} from "@shopify/polaris";
import { DiamondAlertMajor, ImageMajor } from "@shopify/polaris-icons";
import { propagateErrors } from "@shopify/react-form";
import {forwardRef, useImperativeHandle, useRef} from 'react';

/* useMedia is used to support multiple screen sizes */
import { useMedia } from "@shopify/react-hooks";

/* dayjs is used to capture and format the date a QR code was created or modified */
import dayjs from "dayjs";

/* Markup for small screen sizes (mobile) */
function SmallScreenCard({
  node
  // id,
  // name,
  // date,
  // customer,
  // total,
  // payment_status,
  // fullfillment_status,
  // items,
  // delivery_method,
  // tags
}) {
  return (
    <UnstyledLink onClick={() => navigate(`/qrcodes/${id}`)}>
      <div
        style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #E1E3E5" }}
      >
        <Stack>
          {/* <Stack.Item>
            <Thumbnail
              source={product?.images?.edges[0]?.node?.url || ImageMajor}
              alt="placeholder"
              color="base"
              size="small"
            />
          </Stack.Item> */}
          <Stack.Item fill>
            <Stack vertical={true}>
              <Stack.Item>
                <p>
                  <TextStyle variation="strong">
                    {truncate(node.name, 35)}
                  </TextStyle>
                </p>
                <p>{truncate(node.name, 35)}</p>
                <p>{dayjs(createdAt).format("MMMM D, YYYY")}</p>
              </Stack.Item>
              <div style={{ display: "flex" }}>
                <div style={{ flex: "3" }}>
                  <TextStyle variation="subdued">Discount</TextStyle>
                  <p>{discountCode || "-"}</p>
                </div>
                <div style={{ flex: "2" }}>
                  <TextStyle variation="subdued">Scans</TextStyle>
                  <p>{scans}</p>
                </div>
              </div>
            </Stack>
          </Stack.Item>
        </Stack>
      </div>
    </UnstyledLink>
  );
}

export function OrderIndex({ Orders, loading, onChildSelect }) {
  const navigate = useNavigate();

  /* Check if screen is small */
  const isSmallScreen = useMedia("(max-width: 640px)");

  /* Map over QRCodes for small screen */
  // const smallScreenMarkup = Orders.map((Order) => (
  //   <SmallScreenCard key={Order.id} navigate={navigate} {...Order} />
  // ));
  const smallScreenMarkup = Orders.map((Order) => (
    <div>small screen</div>
    // <SmallScreenCard key={Order.id} navigate={navigate} {...Order} />
  ));

  const resourceName = {
    singular: "QR code",
    plural: "QR codes",
  };

  const {selectedResources, allResourcesSelected, handleSelectionChange} = useIndexResourceState(Orders);
 
  // useImperativeHandle(ref, () => ({
  //   selectedData() {
  //     return selectedResources ;
  //   }
  // }), [])

  const rowMarkup = Orders.map(
    ({ id, node }, index) => {
      /* The form layout, created using Polaris components. Includes the QR code data set above. */
      let cargo
      let isInvolveCargo = false
      let cargoN
      node.tags.map(t => {
        if (t.indexOf('Cargo') > -1) {
          isInvolveCargo = true
          cargoN = t.split(':')[1]
        }
      })

      if (!isInvolveCargo) cargo = 'There are no shipments to display'
      else cargo = <div>
        Shipping number<br />
        <div style={{ fontWeight: "bold", color: '#0066FF', marginBottom: 4 }}>{cargoN}</div>
        <div style={{ display: 'inline', backgroundColor: "#c8e3ca", fontSize: 13, textAlign: 'center', borderRadius: 3, paddingTop: 5, paddingLeft: 10, paddingRight: 10, paddingBottom: 5, color: '#5f8147' }}>
          Print label
        </div>
      </div>
      return (
        <IndexTable.Row
          id={id}
          key={id}
          selected={selectedResources.includes(id)}
          position={index}
          onClick={() => {
            // navigate(`/qrcodes/${id}`);
          }}
        >
          <IndexTable.Cell>
            <UnstyledLink data-primary-link url={`/qrcodes/${id}`}>
              {truncate(node.name, 25)}
            </UnstyledLink>
          </IndexTable.Cell>
          <IndexTable.Cell>
            {dayjs(node.processedAt).format("dddd") + " at " + dayjs(node.processedAt).format("h:mm a")}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {node.status == 'FULFILLED' ? 
              <div style={{ display: 'inline', backgroundColor: "#c8e3ca", fontSize: 13, textAlign: 'center', borderRadius: 3, paddingTop: 5, paddingLeft: 10, paddingRight: 10, paddingBottom: 5, color: '#5f8147' }}>
                complete
              </div> : <div style={{ display: 'inline', backgroundColor: "#019bab", fontSize: 13, textAlign: 'center', borderRadius: 3, paddingTop: 5, paddingLeft: 10, paddingRight: 10, paddingBottom: 5, color: 'white' }}>
                processing
              </div>}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {node.total}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {cargo}
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    }
  );
  /* A layout for small screens, built using Polaris components */
  return (
    <Card>
      {isSmallScreen ? (
        smallScreenMarkup
      ) : (
          <IndexTable
            resourceName={resourceName}
            itemCount={Orders.length}
            selectedItemsCount={
              allResourcesSelected ? 'All' : selectedResources.length
            }
            onSelectionChange={(param1, param2, param3) => {
              console.log(123123 , param1, param2, param3)
              handleSelectionChange(param1, param2, param3)
              if (param2) {
                if (param1 === 'single') {
                  const arr = [...selectedResources]
                  arr.push(param3)
                  onChildSelect(arr)
                } else if(param1 === 'page') {
                  const arr = Orders.map(t => t.id)
                  onChildSelect(arr)
                }
              } else {
                if (param1 === 'single') {
                  const arr = [...selectedResources]
                  const index = arr.indexOf(param3);
                  if (index > -1) { // only splice array when item is found
                    arr.splice(index, 1); // 2nd parameter means remove one item only
                  }
                  onChildSelect(arr)
                } else if(param1 === 'page') {
                  onChildSelect([])
                }
              }
            }}
            headings={[
              { title: "Order"},
              { title: "Date" },
              { title: "Status" },
              { title: "Total" },
              { title: "Cargo Express Couriers" },
            ]}
            loading={loading}
          >
            {rowMarkup}
          </IndexTable>
      )}
    </Card>
  );
}

/* A function to truncate long strings */
function truncate(str, n) {
  return str.length > n ? str.substr(0, n - 1) + "…" : str;
}
