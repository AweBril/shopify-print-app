import { useNavigate } from "@shopify/app-bridge-react";
import {
  Card,
  IndexTable,
  Stack,
  TextStyle,
  UnstyledLink,
} from "@shopify/polaris";


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

export function ReportTable({ Orders, loading }) {

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

  const rowMarkup = Orders.map(
    ({ id, title, variant, orderNumber, quantity, pricePerUnit, shippingNumber }, index) => {
      /* The form layout, created using Polaris components. Includes the QR code data set above. */
      return (
        <IndexTable.Row
          id={id}
          key={id}
          position={index}
          onClick={() => {
            // navigate(`/qrcodes/${id}`);
          }}
        >
          <IndexTable.Cell>
            {title}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {orderNumber}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {quantity}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {pricePerUnit}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {shippingNumber}
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
            headings={[
              { title: "של" },
              { title: "מספר הזמנה" },
              { title: "כמות" },
              { title: "מחיר ליחידה" },
              { title: "מספר הזמנה" },
            ]}
            loading={loading}
            selectable={false}
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
