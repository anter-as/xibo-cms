<?php

namespace Xibo\Custom\Entity;

use Xibo\Entity\EntityTrait;
use Xibo\Service\LogServiceInterface;
use Xibo\Storage\StorageServiceInterface;

/**
 * Class Resolution
 * @package Xibo\Entity
 *
 * @SWG\Definition()
 */
class Store implements \JsonSerializable
{
    use EntityTrait;

    /**
     * @SWG\Property(description="The ID of this Store")
     * @var int
     */
    public $storeId;

    /**
     * @SWG\Property(description="The store name")
     * @var string
     */
    public $name;

    /**
     * @SWG\Property(description="The store description")
     * @var string
     */
    public $description;

    /**
     * Entity constructor.
     * @param StorageServiceInterface $store
     * @param LogServiceInterface $log
     * @param \Symfony\Component\EventDispatcher\EventDispatcherInterface $dispatcher
     */
    public function __construct($store, $log, $dispatcher)
    {
        $this->setCommonDependencies($store, $log, $dispatcher);
    }
}
