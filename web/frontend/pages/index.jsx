import { useNavigate, TitleBar, Loading } from '@shopify/app-bridge-react';
import {
	Card,
	EmptyState,
	Layout,
	Page,
	SkeletonBodyText,
	Tabs,
	Select,
	Button,
	Icon,
	TextField,
	Pagination
} from "@shopify/polaris";
import { OrderIndex } from "../components";
import { useAuthenticatedFetch, useAppQuery } from "../hooks";

import { useState, useCallback } from 'react';
import { SearchMinor, FilterMajor, ImageMajor } from "@shopify/polaris-icons"

import { useEffect } from 'react';

const currency = {
	"USD": "$",
	"ILS": "₪",
}

export default function HomePage() {
	/*
		Add an App Bridge useNavigate hook to set up the navigate function.
		This function modifies the top-level browser URL so that you can
		navigate within the embedded app and keep the browser in sync on reload.
	*/
	const navigate = useNavigate();
	const fetch = useAuthenticatedFetch();

	const [selectedTab, setSelectedTab] = useState(0);
	const [tabquery, setTabquery] = useState('')

	const handleTabChange = useCallback(
		(selectedTabIndex) => {
			setSelectedTab(selectedTabIndex)
			if (selectedTabIndex == 0) {
				setTabquery('');
			} else if (selectedTabIndex == 1) {
				setTabquery('status:"open" fulfillment_status:"unshipped,partial"');

			} else if (selectedTabIndex == 2) {
				setTabquery('fulfillment_status:"shipped"');
			}
		},
		[],
	);

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

	const [isLoading, setIsLoading] = useState(false);
	const [ordersList, setOrdersList] = useState({})
	const [pageInfo, setPageInfo] = useState({})
	const [query, setQuery] = useState('')
	
	const [dayquery, setDayquery] = useState('')
	const pageSize = 10;
	
	const variables = {
		"ordersFirst": pageSize,
		"sortKey": "PROCESSED_AT",
		"reverse": true,
		"query": query + ' ' + tabquery + ' ' + dayquery,
	}

	const func = (orders) => {
		let data = []
		data = orders.edges.map(t => {
			const order = {}
			order.id = t.node.id
			const node = {}
			node.name = t.node.name
			node.processedAt = t.node.processedAt
			node.tags = t.node.tags
			node.status = t.node.displayFulfillmentStatus
			node.total = t.node.currentTotalPriceSet.shopMoney.amount + currency[t.node.currentTotalPriceSet.shopMoney.currencyCode]
			order.node = node
			return order
		})
		setOrdersList(data);
		setPageInfo(orders.pageInfo)
	}

	useEffect(async () => {
		setIsLoading(true);
		const response = await fetch("/api/ordersList", {
			method: "POST",
			body: JSON.stringify({ variables }),
			headers: { "Content-Type": "application/json" },
		});

		if (response.ok) {
			const res = await response.json()
			const orders = res.body.data.orders
			func(orders)
			setIsLoading(false);
		}
	}, [query, tabquery, dayquery]);

	const [selectedItem, setSelectedItem] = useState('bulk_actions');
	const [dateFilter, setDateFiler] = useState('');
	
	const handleSelectChange = useCallback((value) => setSelectedItem(value), []);

	const handleDateFilterChange = useCallback((value) => {
		setDateFiler(value)
		setDayquery(value)
	}, []);

	const options = [
		{ label: 'Bulk actions', value: 'bulk_actions' },
		{ label: 'print_label', value: 'print_label' },
	];

	const [searchValue, setSearchValue] = useState("");

	const handleSearchInputChange = (value) => {
		setQuery(value)
		setSearchValue(value)
	};

	const onSearch = async () => {
	
	}

	const [selectedChild, setSelectedChild] = useState([])

	const ordersMarkup = ordersList?.length ? (
		<Card>
			<Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange} />
			<OrderIndex Orders={ordersList} loading={isLoading} onChildSelect={e => myFunc(e)} />
			<div style={{ display: 'flex', justifyContent: 'center', paddingTop: 25, paddingBottom: 25 }}>
				<Pagination
					hasPrevious={pageInfo?.hasPreviousPage}
					onPrevious={async () => {
						setIsLoading(true);

						const variables = {
							ordersLast: pageSize,
							before: pageInfo.startCursor,
							sortKey: "PROCESSED_AT",
							query: query + ' ' + tabquery + ' ' + dayquery,
							reverse: true,
						}

						const response = await fetch("/api/ordersList", {
							method: "POST",
							body: JSON.stringify({ variables }),
							headers: { "Content-Type": "application/json" },
						});

						if (response.ok) {
							const res = await response.json()
							func(res.body.data.orders)
							setIsLoading(false);
						}
					}}

					hasNext={pageInfo?.hasNextPage}
					onNext={async () => {
						setIsLoading(true);

						const variables = {
							ordersFirst: pageSize,
							after: pageInfo.endCursor,
							sortKey: "PROCESSED_AT",
							query: query + ' ' + tabquery + ' ' + dayquery,
							reverse: true,
						}
						const response = await fetch("/api/ordersList", {
							method: "POST",
							body: JSON.stringify({ variables }),
							headers: { "Content-Type": "application/json" },
						});

						if (response.ok) {
							setIsLoading(false);
							const res = await response.json()
							func(res.body.data.orders)
						}

					}}
				/>
			</div>
		</Card>
	) : null;
	const myFunc = (val) => {
		setSelectedChild(val)
	}

	const printLabel = async () => {
		const selIds = []
		selectedChild.map(t => {
			let isCargo = false
			const order = ordersList.find(t1 => t1.id === t)
			const arr = t.split("/")
			const id = arr[arr.length - 1]
			selIds.push({ id })
			
		})
		if (selIds.length === 0) alert('No items to apply!')
		else {
			setIsLoading(true);
			if (selectedItem == 'print_label') {
				const response = await fetch("/api/printLabel", {
					method: "POST",
					body: JSON.stringify({selIds}),
					headers: { "Content-Type": "application/json" },
				});
				if (response.ok) {
					setIsLoading(false);
					window.open("https://testaddictapp.myshopify.com/pages/print_label", "_blank")
				}
			}
		}
	}

	/* loadingMarkup uses the loading component from AppBridge and components from Polaris  */
	const loadingMarkup = isLoading ? (
		<Card sectioned>
			<Loading />
			<SkeletonBodyText />
		</Card>
	) : null;

	/* Use Polaris Card and EmptyState components to define the contents of the empty state */
	const emptyStateMarkup =
		!isLoading && !ordersList.length ? (
			<Card sectioned>
				<EmptyState
					heading="No orders found"
					action={{
						content: "Orders",
					}}
					image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
				>
				</EmptyState>
			</Card>
		) : null;

	return (
		<Page fullWidth={true}>
			<div style={{ backgroundColor: 'white' }}>
				<TitleBar
					title="Orders"
					primaryAction={{
						content: "Report",
						onAction: () => navigate("/report")
					}}
				/>
				<Layout>
					<Layout.Section>
						<div style={{ display: 'flex' }}>
							<div style={{ width: 200, paddingLeft: 15 }}>
								<Select
									options={options}
									onChange={handleSelectChange}
									value={selectedItem}
								/>
							</div>
							<div style={{ height: 50, paddingLeft: 15 }}>
								<Button disabled={selectedItem !== 'print_label'} onClick={printLabel}>
									<span style={{ color: selectedItem !== 'print_label' ? 'gery' : '#2271b1', fontSize: 14 }}>Apply</span>
								</Button>
							</div>
							<div style={{ marginLeft: 40, paddingTop: 7 }}>
								Search orders by date
							</div>
							<div style={{ marginLeft: 15, width: 140 }}>
								<Select
									options={[
										{ label: '', value: '' },
										{ label: 'Today', value: 'processed_at:\"past_day\"' },
										{ label: 'Last 7 days', value: 'processed_at:\"past_week\"' },
										{ label: 'Last 30 days', value: 'processed_at:\"past_month\"' },
										{ label: 'Last 90 days', value: 'processed_at:\"past_quarter\"' },
										{ label: 'Last 12 months', value: 'processed_at:\"past_year\"' },
									]}
									onChange={handleDateFilterChange}
									value={dateFilter}
								/>
							</div>
							<div style={{ height: 50, paddingLeft: 15 }}>
								<TextField
									value={searchValue}
									labelHidden
									type="text"
									onChange={handleSearchInputChange}
									prefix={<Icon source={SearchMinor} color="inkLightest" />}
									placeholder="search"
									maxHeight={100}
								/>
							</div>
						</div>
					</Layout.Section>
					<Layout.Section>
						{loadingMarkup}
						{!isLoading && ordersMarkup}
						{emptyStateMarkup}
					</Layout.Section>
				</Layout>
			</div>
		</Page>
	)
}