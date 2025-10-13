'use client';
import Dropdown from '@/components/dropdown';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconChrome from '@/components/icon/icon-chrome';
import { IRootState } from '@/store';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useSelector } from 'react-redux';

const ComponentsDashboardAnalytics = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // totalVisitOptions
    const totalVisit: any = {
        series: [{ data: [21, 9, 36, 12, 44, 25, 59, 41, 66, 25] }],
        options: {
            chart: { height: 58, type: 'line', sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#009688'],
            tooltip: { x: { show: false }, y: { title: { formatter: () => '' } } },
        },
    };

    // paidVisitOptions
    const paidVisit: any = {
        series: [{ data: [22, 19, 30, 47, 32, 44, 34, 55, 41, 69] }],
        options: {
            chart: { height: 58, type: 'line', sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#e2a03f'],
            tooltip: { x: { show: false }, y: { title: { formatter: () => '' } } },
        },
    };

    // uniqueVisitorSeriesOptions
    const uniqueVisitorSeries: any = {
        series: [
            { name: 'Direct', data: [58, 44, 55, 57, 56, 61, 58, 63, 60, 66, 56, 63] },
            { name: 'Organic', data: [91, 76, 85, 101, 98, 87, 105, 91, 114, 94, 66, 70] },
        ],
        options: {
            chart: { height: 360, type: 'bar', toolbar: { show: false } },
            dataLabels: { enabled: false },
            stroke: { width: 2, colors: ['transparent'] },
            colors: ['#5c1ac3', '#ffbb44'],
            plotOptions: { bar: { borderRadius: 8, columnWidth: '55%' } },
            legend: { position: 'bottom', fontSize: '14px' },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed' },
            xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
            yaxis: { tickAmount: 6 },
        },
    };

    return (
        <div>
            {/* Breadcrumb */}
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Analytics</span>
                </li>
            </ul>

            {/* Top Section */}
            <div className="pt-5">
                <div className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                    {/* Statistics Card */}
                    <div className="panel h-full">
                        <div className="mb-5 flex justify-between dark:text-white-light">
                            <h5 className="text-lg font-semibold ">Statistics</h5>
                            <Dropdown
                                offset={[0, 5]}
                                placement={isRtl ? 'bottom-start' : 'bottom-end'}
                                btnClassName="hover:text-primary"
                                button={<IconHorizontalDots className="text-black/70 hover:!text-primary dark:text-white/70" />}
                            >
                                <ul>
                                    <li><button type="button">This Week</button></li>
                                    <li><button type="button">Last Week</button></li>
                                    <li><button type="button">This Month</button></li>
                                    <li><button type="button">Last Month</button></li>
                                </ul>
                            </Dropdown>
                        </div>
                        <div className="grid gap-8 text-sm font-bold text-[#515365] sm:grid-cols-2">
                            <div>
                                <div>Total Visits</div>
                                <div className="text-lg text-[#f8538d]">423,964</div>
                                {isMounted && <ReactApexChart series={totalVisit.series} options={totalVisit.options} type="line" height={58} width={'100%'} />}
                            </div>
                            <div>
                                <div>Paid Visits</div>
                                <div className="text-lg text-[#f8538d]">7,929</div>
                                {isMounted && <ReactApexChart series={paidVisit.series} options={paidVisit.options} type="line" height={58} width={'100%'} />}
                            </div>
                        </div>
                    </div>

                    {/* Expenses Card */}
                    <div className="panel h-full">
                        <div className="mb-5 flex justify-between dark:text-white-light">
                            <h5 className="text-lg font-semibold ">Expenses</h5>
                            <Dropdown
                                offset={[0, 5]}
                                placement={isRtl ? 'bottom-start' : 'bottom-end'}
                                btnClassName="hover:text-primary"
                                button={<IconHorizontalDots className="text-black/70 hover:!text-primary dark:text-white/70" />}
                            >
                                <ul>
                                    <li><button type="button">This Week</button></li>
                                    <li><button type="button">Last Week</button></li>
                                    <li><button type="button">This Month</button></li>
                                    <li><button type="button">Last Month</button></li>
                                </ul>
                            </Dropdown>
                        </div>
                        <div className="my-10 text-3xl font-bold text-[#e95f2b]">
                            <span>$ 45,141 </span>
                            <span className="text-sm text-black ltr:mr-2 rtl:ml-2 dark:text-white-light">this week</span>
                            <IconTrendingUp className="inline text-success" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="h-5 w-full overflow-hidden rounded-full bg-dark-light p-1">
                                <div
                                    className="relative h-full w-full rounded-full bg-gradient-to-r from-[#4361ee] to-[#805dca]"
                                    style={{ width: '65%' }}
                                ></div>
                            </div>
                            <span className="ltr:ml-5 rtl:mr-5 dark:text-white-light">57%</span>
                        </div>
                    </div>
                </div>

                {/* Unique Visitors Chart */}
                <div className="mb-6 grid gap-6">
                    <div className="panel h-full p-0">
                        <div className="mb-5 flex items-start justify-between border-b border-white-light p-5 dark:border-[#1b2e4b] dark:text-white-light">
                            <h5 className="text-lg font-semibold">Unique Visitors</h5>
                        </div>
                        {isMounted && (
                            <ReactApexChart
                                options={uniqueVisitorSeries.options}
                                series={uniqueVisitorSeries.series}
                                type="bar"
                                height={360}
                                width={'100%'}
                            />
                        )}
                    </div>
                </div>

                {/* Visitors by Browser */}
                <div className="mb-6 grid gap-6 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="panel h-full sm:col-span-3 xl:col-span-2">
                        <div className="mb-5 flex items-start justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Visitors by Browser</h5>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <IconChrome className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between font-semibold text-white-dark">
                                    <span>Chrome</span>
                                    <span className="text-xs">65%</span>
                                </div>
                                <div className="h-2 mt-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-2 bg-gradient-to-r from-[#009ffd] to-[#2a2a72]" style={{ width: '65%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentsDashboardAnalytics;
