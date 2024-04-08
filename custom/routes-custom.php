<?php

use Xibo\Middleware\FeatureAuth;

$app->get('/store/view', ['\Xibo\Custom\Controller\Store','displayPage'])
    ->add(new FeatureAuth($app->getContainer(), ['store.view']))
    ->setName('store.view');
