/**
 * LLM Council Module Configuration
 * Defines routes, navigation items, and metadata for the LLM Council module
 */

import { Users, MessageSquare, History, Settings, UserCircle } from 'lucide-svelte';
import type { ModuleConfig } from '$lib/config/types';

const councilConfig: ModuleConfig = {
	id: 'MoLOS-LLM-Council',
	name: 'LLM Council',
	href: '/ui/MoLOS-LLM-Council',
	icon: Users,
	description: 'Multi-LLM council for diverse AI perspectives',
	navigation: [
		{
			name: 'Council',
			icon: MessageSquare,
			href: '/ui/MoLOS-LLM-Council'
		},
		{
			name: 'Personas',
			icon: UserCircle,
			href: '/ui/MoLOS-LLM-Council/personas'
		},
		{
			name: 'History',
			icon: History,
			href: '/ui/MoLOS-LLM-Council/history'
		},
		{
			name: 'Settings',
			icon: Settings,
			href: '/ui/MoLOS-LLM-Council/settings'
		}
	]
};

export { councilConfig as moduleConfig };
export default councilConfig;
