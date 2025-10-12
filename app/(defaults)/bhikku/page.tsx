import ComponentsDatatablesMultipleTables from '@/components/datatables/components-datatables-multiple-tables';
import IconBell from '@/components/icon/icon-bell';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Multiple Tables',
};

const MultipleTables = () => {
    return (
        <div>
            <ComponentsDatatablesMultipleTables />
        </div>
    );
};

export default MultipleTables;
