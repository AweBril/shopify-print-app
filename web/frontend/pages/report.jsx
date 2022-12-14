import { useNavigate, TitleBar, Loading } from '@shopify/app-bridge-react';
import { useEffect } from 'react';
import {
	Card,
	EmptyState,
	Layout,
	Page,
	SkeletonBodyText,
	Tabs,
	Select,
	Button,
	TextStyle,
	Icon,
	TextField,
	Pagination,
	DatePicker,
	Popover,
} from "@shopify/polaris";
import FileSaver from 'file-saver';

import { ReportTable } from "../components";
import { useAuthenticatedFetch, useAppQuery } from "../hooks";

import { useState, useCallback } from 'react';
import { OrderStatusMinor } from '@shopify/polaris-icons';

export default function ReportPage() {
	/*
		Add an App Bridge useNavigate hook to set up the navigate function.
		This function modifies the top-level browser URL so that you can
		navigate within the embedded app and keep the browser in sync on reload.
	*/
	const navigate = useNavigate();
	const fetch = useAuthenticatedFetch();

	const [selectedTab, setSelectedTab] = useState(0);

	const [isLoading, setIsLoading] = useState(false);
	const [isRefetching, setRefetching] = useState(false);
	const [ordersList, setOrdersList] = useState({})
	const [pageInfo, setPageInfo] = useState({})

	const pageSize = 10
	let query = "Cargo Tracking: fulfillment_status:\"unshipped\"";
	const [dateQuery, setDateQuery] = useState('');
	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')
	const variables = {
		"ordersFirst": pageSize,
		"sortKey": "PROCESSED_AT",
		"reverse": true,
		"query": query + ' ' + dateQuery,
	}

	const func = (res) => {
		const data = []
		console.log(res);
		res.map(ordersList => {
			console.log(ordersList.body.data.orders);
			ordersList.body.data.orders.edges.map(t => {
				console.log(t);
				let cargoN
				t.node.tags.map(t => {
					if (t.indexOf('Cargo') > -1) cargoN = t.split(':')[1]
				})
				t.node.lineItems.nodes.map(t1 => {
					const order = {}
					order.title = t1.name
					order.variant = t1.variantTitle
					order.orderNumber = 'DD' + t?.node?.name?.slice(1, t?.node?.name?.length)
					order.quantity = t1.quantity
					order.pricePerUnit = t1.variant.price
					order.shippingNumber = cargoN
					data.push(order)
				})
			})
		})
		console.log(data)
		setOrdersList(data);
		// setPageInfo(ordersList[0].pageInfo)
	}

	useEffect(async () => {
		setIsLoading(true);
		const response = await fetch("/api/reportsList", {
			method: "POST",
			body: JSON.stringify({ variables }),
			headers: { "Content-Type": "application/json" },
		});

		if (response.ok) {
			const res = await response.json()
			// const ordersList = res.body.data.orders
			func(res)
			setIsLoading(false);
		}
	}, [startDate, endDate]);

	const tabs = [
		{
			id: 'all-orders-1',
			content: 'All',
			accessibilityLabel: 'All orders',
			panelID: 'all-orders-content-1',
		},
		{
			id: 'processing-orders-1',
			content: 'Processing',
			panelID: 'processing-orders-content-1',
		},
		{
			id: 'complete-orders-1',
			content: 'Complete',
			panelID: 'complete-orders-content-1',
		},
	];


	/* Set the QR codes to use in the list */
	const reportTable = ordersList?.length ? (
		<Card>
			<ReportTable Orders={ordersList} loading={isRefetching} />
			{/* <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 25, paddingBottom: 25 }}>
				<Pagination
					hasPrevious={pageInfo?.hasPreviousPage}
					onPrevious={async () => {
						console.log('Previous');

						const variables = {
							ordersLast: pageSize,
							before: pageInfo.startCursor,
							sortKey: "PROCESSED_AT",
							query: query,
							reverse: true,
						}

						const response = await fetch("/api/reportsList", {
							method: "POST",
							body: JSON.stringify({ variables }),
							headers: { "Content-Type": "application/json" },
						});

						if (response.ok) {
							const res = await response.json()
							func(res.body.data.orders)
							console.log(res.body.data.orders)
						}
					}}

					hasNext={pageInfo?.hasNextPage}
					onNext={async () => {
						console.log('Next');

						const variables = {
							ordersFirst: pageSize,
							after: pageInfo.endCursor,
							sortKey: "PROCESSED_AT",
							query: query,
							reverse: true,
						}
						const response = await fetch("/api/reportsList", {
							method: "POST",
							body: JSON.stringify({ variables }),
							headers: { "Content-Type": "application/json" },
						});

						if (response.ok) {
							const res = await response.json()
							func(res.body.data.orders)
							console.log(res.body.data.orders)
						}

					}}
				/>
			</div> */}
		</Card>
	) : null;

	

	/* loadingMarkup uses the loading component from AppBridge and components from Polaris  */
	const loadingMarkup = isLoading ? (
		<Card sectioned>
			<Loading />
			<SkeletonBodyText />
		</Card>
	) : null;

	/* Use Polaris Card and EmptyState components to define the contents of the empty state */
	const emptyStateMarkup =
		!isLoading && !ordersList?.length ? (
			<Card sectioned>
				<EmptyState
					heading="No orders found"
					/* This button will take the user to a Create a QR code page */
					action={{
						content: "Orders",
						// onAction: () => navigate("/qrcodes/new"),
					}}
					image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
				>
				</EmptyState>
			</Card>
		) : null;

	const [startOrderNumber, setStartOrderNumber] = useState('');
	const [endOrderNumber, setEndOrderNumber] = useState('');
	const [popoverActive1, setPopoverActive1] = useState(false);
	const [popoverActive2, setPopoverActive2] = useState(false);
	const togglePopoverActive1 = useCallback(
		() => setPopoverActive1((popoverActive) => !popoverActive),
		[],
	);
	const togglePopoverActive2 = useCallback(
		() => setPopoverActive2((popoverActive) => !popoverActive),
		[],
	);
	
	const [{month, year}, setDate] = useState({month: new Date().getMonth(), year: new Date().getFullYear()});
	const [selectedDates, setSelectedDates] = useState({
		start: new Date(),
    	end: new Date(),
	});

	const handleMonthChange = useCallback(
		(month, year) => setDate({month, year}),
		[],
	);

	const [{month1, year1}, setDate1] = useState({month1: new Date().getMonth(), year1: new Date().getFullYear()});
	const [selectedDates1, setSelectedDates1] = useState({
		start: new Date(),
    	end: new Date(),
	});

	const handleMonthChange1 = useCallback(
		(month, year) => setDate1({month, year}),
		[],
	);

	const activator1 = (
		<TextField onFocus={setPopoverActive1}
			placeholder="YYYY-MM-DD"
			value={startDate}
			onChange={e => setStartDate(e)}
			autoComplete="off"
		/>
	);
	const activator2 = (
		<TextField onFocus={togglePopoverActive2}
			placeholder="YYYY-MM-DD"
			value={endDate}
			onChange={e => setEndDate(e)}
			autoComplete="off"
		/>
	);
	return (
		<Page fullWidth={true}>
			<div style={{ backgroundColor: 'white' }}>
				<TitleBar
					title='דו"ח ליקוט'
					primaryAction={{
						content: "Order",
						onAction: () => navigate("/")
					}}
				/>
				<Layout>
					<Layout.Section>
						<div style={{ display: 'flex' }}>
							<div style={{ marginTop: 7, paddingRight: 15, paddingLeft: 15 }}>Date: </div>
							<div style={{ width: 120 }}>
								<Popover
									style={{width:'100%'}}
									active={popoverActive1}
									activator={activator1}
									autofocusTarget="first-node"
									onClose={togglePopoverActive1}
								>
									<DatePicker
										month={month}
										year={year}
										onChange={e => {
											setSelectedDates(e)
											setStartDate(`${e.start?.getFullYear()}-${e.start?.getMonth() + 1}-${e.start?.getDate()}`)
										}}
										onMonthChange={handleMonthChange}
										selected={selectedDates}
									/>
								</Popover>
							</div>
							<div style={{ marginTop: 7 }}>~</div>
							<div style={{ width: 120 }}>
								<Popover
									active={popoverActive2}
									activator={activator2}
									autofocusTarget="first-node"
									onClose={togglePopoverActive2}
								>
									<DatePicker
										month={month1}
										year={year1}
										onChange={e => {
											setSelectedDates1(e)
											setEndDate(`${e.start?.getFullYear()}-${e.start?.getMonth() + 1}-${e.start?.getDate()}`)
										}}
										onMonthChange={handleMonthChange1}
										selected={selectedDates1}
									/>
								</Popover>
							</div>
							{/* <div style={{ marginTop: 7, paddingLeft: 15, paddingRight: 15 }}>Order Number: </div>
							<div style={{ width: 130 }}>
								<TextField
									placeholder="start"
									value={startOrderNumber}
									onChange={e => setStartOrderNumber(e)}
									autoComplete="off"
								/>
							</div>
							<div style={{ marginTop: 7 }}>~</div>
							<div style={{ width: 130 }}>
								<TextField
									placeholder="end"
									value={endOrderNumber}
									onChange={e => setEndOrderNumber(e)}
									autoComplete="off"
								/>
							</div> */}
							<div style={{ height: 50, paddingLeft: 15 }}>
								<Button onClick={ async ()=>{
									if (startDate == "" && endDate != "") { setDateQuery(`processed_at:<\"${endDate}\"`)}
									else if (startDate != "" && endDate == "") { setDateQuery(`processed_at:>\"${startDate}\"`)}
									else { setDateQuery(`processed_at:>\"${startDate}\" AND processed_at:<\"${endDate}\"`)}
								}}>
									<div style={{ color: '#2271b1', fontSize: 14 }}>
									סנן	
									</div>
								</Button>
							</div>
							<div style={{ height: 50, paddingLeft: 15 }}>
								<Button onClick={ async ()=>{
									setIsLoading(true)
									const response = await fetch("/api/downloadExcel", {
										method: "POST",
										body: JSON.stringify({ variables }),
										headers: { "Content-Type": "application/json" },
									});

									const data = await response.arrayBuffer();
									const filename = `${Date.now()}.xlsx`;
																
									var blob = new Blob([new Uint8Array(data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
									FileSaver.saveAs(blob, filename);
									setIsLoading(false)

								}}>
									<div style={{ color: '#2271b1', fontSize: 14 }}>
									הורדת דו"ח לקובץ
									</div>
								</Button>
							</div>
						</div>
					</Layout.Section>
					<Layout.Section>
						{loadingMarkup}
						{!isLoading && reportTable}
						{emptyStateMarkup}
					</Layout.Section>
				</Layout>
			</div>
		</Page>
	)
}