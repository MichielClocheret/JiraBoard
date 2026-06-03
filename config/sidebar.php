<?php
declare(strict_types=1);

return [
    'main_sections' => [
        [
            'key'   => 'dashboard',
            'label' => 'Dashboard',
            'items' => [
                [
                    'tab'    => 'overview',
                    'title'  => 'Overview',
                    'label'  => 'Overview',
                    'icon'   => '🏠',
                    'active' => true,
                ],
                [
                    'tab'   => 'allProjects',
                    'title' => 'All Projects',
                    'label' => 'All Projects',
                    'icon'  => '📦',
                ],
                [
                    'tab'             => 'allChats',
                    'title'           => 'All Chats',
                    'label'           => 'All Chats',
                    'icon'            => '💬',
                    'hidden_for_guest'=> true,
                    'label_id'        => 'all-chats-nav-label',
                    'badge'           => [
                        'id'    => 'all-chats-nav-count',
                        'text'  => '0',
                        'style' => 'display:none',
                    ],
                ],
            ],
        ],
        [
            'key'   => 'tools',
            'label' => 'Tools',
            'items' => [
                [
                    'tab'   => 'veauDevManager',
                    'title' => 'VeauDev Manager',
                    'label' => 'VeauDev Manager',
                    'icon'  => '💻',
                ],
                [
                    'tab'   => 'passwordManager',
                    'title' => 'Password Manager',
                    'label' => 'Password Manager',
                    'icon'  => '🔑',
                ],
                [
                    'tab'   => 'veauFinder',
                    'title' => 'VeauFinder',
                    'label' => 'VeauFinder',
                    'icon'  => '📁',
                ],
            ],
        ],
    ],
];
