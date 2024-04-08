<?php

namespace Xibo\Custom\Controller;

use Slim\Http\Response as Response;
use Slim\Http\ServerRequest as Request;
use Xibo\Controller\Base;

class Store extends Base
{
    /**
     * @param Request $request
     * @param Response $response
     * @return \Psr\Http\Message\ResponseInterface|Response
     * @throws \Xibo\Support\Exception\ControllerNotImplemented
     * @throws \Xibo\Support\Exception\GeneralException
     */
    public function displayPage(Request $request, Response $response)
    {//var_dump($this);die();
        // Call to render the template
        $this->getState()->template = 'store-page';

        return $this->render($request, $response);
    }
}
